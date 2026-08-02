<#
.SYNOPSIS
    OCR batch — convertit chaque PDF/image d'un dossier en .txt (un fichier = un .txt).
    Moteur OCR natif Windows (Windows.Media.Ocr) : aucune dépendance externe.

.DESCRIPTION
    Charge le moteur OCR une seule fois puis traite tous les fichiers .pdf
    (et .png/.jpg/.jpeg/.bmp/.tif) du dossier -Path. Pour chaque fichier
    <nom>.pdf, écrit <nom>.txt dans -OutDir.

.PARAMETER Path
    Dossier source contenant les PDF/images (défaut : dossier courant).

.PARAMETER OutDir
    Dossier de sortie des .txt (défaut : même dossier que -Path).

.PARAMETER Language
    Code langue OCR BCP-47 (défaut : fr). Langues dispo :
    [Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages

.PARAMETER Dpi
    Résolution de rendu des pages PDF avant OCR (défaut : 300).

.PARAMETER Force
    Réécrit les .txt déjà présents (sinon ils sont ignorés).

.EXAMPLE
    .\pdf2txt.ps1 -Path .\ff_pdfs -Language fr
.EXAMPLE
    .\pdf2txt.ps1 -Path .\ff_pdfs -OutDir .\ff_txt -Dpi 400 -Force
#>

param(
    [string]$Path = ".",
    [string]$OutDir,
    [string]$Language = "fr",
    [int]$Dpi = 300,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Path)) { Write-Error "Dossier introuvable : $Path"; exit 1 }
$Path = (Resolve-Path $Path).Path
if (-not $OutDir) { $OutDir = $Path }
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
$OutDir = (Resolve-Path $OutDir).Path

# --- API Windows Runtime ----------------------------------------------------
Add-Type -AssemblyName System.Runtime.WindowsRuntime

[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]                 | Out-Null
[Windows.Media.Ocr.OcrResult, Windows.Foundation, ContentType = WindowsRuntime]                 | Out-Null
[Windows.Globalization.Language, Windows.Foundation, ContentType = WindowsRuntime]              | Out-Null
[Windows.Storage.StorageFile, Windows.Foundation, ContentType = WindowsRuntime]                 | Out-Null
[Windows.Storage.Streams.IRandomAccessStream, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime]      | Out-Null
[Windows.Graphics.Imaging.SoftwareBitmap, Windows.Foundation, ContentType = WindowsRuntime]     | Out-Null
[Windows.Data.Pdf.PdfDocument, Windows.Foundation, ContentType = WindowsRuntime]                | Out-Null

$script:AsTaskOperation = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]
$script:AsTaskAction = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
    $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction'
})[0]

function Await($WinRtTask, [Type]$ResultType) {
    $asTask = $script:AsTaskOperation.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}
function Await-Action($WinRtAction) {
    $netTask = $script:AsTaskAction.Invoke($null, @($WinRtAction))
    $netTask.Wait(-1) | Out-Null
}

function Get-OcrEngine([string]$LangTag) {
    $lang = New-Object Windows.Globalization.Language($LangTag)
    if ([Windows.Media.Ocr.OcrEngine]::IsLanguageSupported($lang)) {
        return [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
    }
    Write-Warning "Pack OCR '$LangTag' absent -> moteur par défaut du profil."
    return [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
}

function Get-SoftwareBitmap([string]$ImagePath) {
    $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($ImagePath)) ([Windows.Storage.StorageFile])
    $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $stream.Dispose()
    return $bitmap
}

function Get-Text($Bitmap, $Engine) {
    (Await ($Engine.RecognizeAsync($Bitmap)) ([Windows.Media.Ocr.OcrResult])).Text
}

function Ocr-Pdf([string]$PdfPath, $Engine, [int]$Dpi) {
    $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($PdfPath)) ([Windows.Storage.StorageFile])
    $pdfDoc = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
    $sb = New-Object System.Text.StringBuilder
    $scale = $Dpi / 96.0
    for ($i = 0; $i -lt $pdfDoc.PageCount; $i++) {
        $page = $pdfDoc.GetPage([uint32]$i)
        $tmp = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "p2t_$([guid]::NewGuid()).png")
        $tmpFile = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync((New-Item -ItemType File -Path $tmp -Force).FullName)) ([Windows.Storage.StorageFile])
        $stream = Await ($tmpFile.OpenAsync([Windows.Storage.FileAccessMode]::ReadWrite)) ([Windows.Storage.Streams.IRandomAccessStream])
        $opt = New-Object Windows.Data.Pdf.PdfPageRenderOptions
        $opt.DestinationWidth  = [uint32]($page.Size.Width  * $scale)
        $opt.DestinationHeight = [uint32]($page.Size.Height * $scale)
        Await-Action ($page.RenderToStreamAsync($stream, $opt))
        $stream.Dispose(); $page.Dispose()
        $bmp = Get-SoftwareBitmap $tmp
        if ($pdfDoc.PageCount -gt 1) { [void]$sb.AppendLine("--- Page $($i + 1) ---") }
        [void]$sb.AppendLine((Get-Text $bmp $Engine))
        Remove-Item $tmp -ErrorAction SilentlyContinue
    }
    return $sb.ToString()
}

# --- Boucle batch -----------------------------------------------------------
Write-Host "[info] Moteur OCR (langue: $Language)..." -ForegroundColor Cyan
$engine = Get-OcrEngine $Language
if (-not $engine) { Write-Error "Impossible d'initialiser le moteur OCR."; exit 1 }

$imgExt = @(".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff")
$files = Get-ChildItem -Path $Path -File | Where-Object {
    $_.Extension.ToLower() -eq ".pdf" -or $imgExt -contains $_.Extension.ToLower()
} | Sort-Object { if ($_.BaseName -match '^\d+$') { [int]$_.BaseName } else { [int]::MaxValue } }, Name

Write-Host "[info] $($files.Count) fichier(s) dans $Path -> $OutDir`n" -ForegroundColor Cyan

$ok = $skip = $fail = 0
foreach ($f in $files) {
    $out = Join-Path $OutDir ($f.BaseName + ".txt")
    if ((Test-Path $out) -and -not $Force) {
        Write-Host "  [skip] $($f.Name)" -ForegroundColor DarkGray; $skip++; continue
    }
    try {
        $text = if ($f.Extension.ToLower() -eq ".pdf") {
            Ocr-Pdf $f.FullName $engine $Dpi
        } else {
            Get-Text (Get-SoftwareBitmap $f.FullName) $engine
        }
        Set-Content -Path $out -Value $text -Encoding UTF8
        Write-Host "  [ok]   $($f.Name) -> $($f.BaseName).txt  ($($text.Length) car.)" -ForegroundColor Green
        $ok++
    } catch {
        Write-Host "  [fail] $($f.Name) : $($_.Exception.Message)" -ForegroundColor Red
        $fail++
    }
}

Write-Host "`n[résumé] ok=$ok  skip=$skip  fail=$fail  total=$($files.Count)" -ForegroundColor Cyan
