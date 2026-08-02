<#
.SYNOPSIS
    OCR natif Windows (sans Tesseract/Poppler) — extrait le texte d'images PNG/JPG
    ou de PDF (page par page, converties en images via Windows.Data.Pdf).

.DESCRIPTION
    Utilise les API Windows Runtime intégrées à Windows 10/11 :
      - Windows.Media.Ocr.OcrEngine       -> moteur OCR (le même que la Loupe / Capture d'écran)
      - Windows.Data.Pdf.PdfDocument      -> rendu des pages PDF en bitmap
    Aucune dépendance externe (pas de pip, pas de Tesseract, pas de Poppler).

.PARAMETER Path
    Chemin du fichier source (.pdf, .png, .jpg, .jpeg, .bmp, .tif)

.PARAMETER OutputPath
    Chemin du .txt de sortie (défaut : même nom que la source, extension .txt)

.PARAMETER Language
    Code langue BCP-47 du pack OCR Windows installé (ex: fr, en).
    Lister les langues installées : Get-WinUserLanguageList
    Si non installé : Réglages > Heure et langue > Langue et région > Ajouter une langue
    puis cocher "Reconnaissance optique de caractères" dans les options de la langue.

.PARAMETER Dpi
    Résolution de rendu des pages PDF avant OCR (défaut : 300). Monter à 400-600
    pour les petites polices ou partitions denses.

.EXAMPLE
    .\Invoke-NativeOcr.ps1 -Path .\partition.pdf -Language fr
.EXAMPLE
    .\Invoke-NativeOcr.ps1 -Path .\scan.png -OutputPath .\scan_ocr.txt
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [string]$OutputPath,

    [string]$Language = "fr",

    [int]$Dpi = 300
)

# --- Vérifications de base -------------------------------------------------

if (-not (Test-Path $Path)) {
    Write-Error "Fichier introuvable : $Path"
    exit 1
}

$Path = (Resolve-Path $Path).Path
$ext = [System.IO.Path]::GetExtension($Path).ToLower()

if (-not $OutputPath) {
    $OutputPath = [System.IO.Path]::ChangeExtension($Path, ".txt")
}

# --- Chargement des API Windows Runtime ------------------------------------

# PowerShell 5.1 : charger les méthodes d'extension WinRT (AsTask) sinon
# [System.WindowsRuntimeSystemExtensions] est introuvable.
Add-Type -AssemblyName System.Runtime.WindowsRuntime

[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]            | Out-Null
[Windows.Media.Ocr.OcrResult, Windows.Foundation, ContentType = WindowsRuntime]            | Out-Null
[Windows.Globalization.Language, Windows.Foundation, ContentType = WindowsRuntime]         | Out-Null
[Windows.Storage.StorageFile, Windows.Foundation, ContentType = WindowsRuntime]            | Out-Null
[Windows.Storage.Streams.IRandomAccessStream, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.SoftwareBitmap, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null

# --- Helpers Await WinRT (PowerShell 5.1) -----------------------------------
# La méthode d'extension AsTask est générique. On résout deux variantes :
#   - IAsyncOperation`1<TResult> -> Task<TResult>  (renvoie un résultat)
#   - IAsyncAction               -> Task           (action sans résultat)

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

function Get-OcrEngineForLanguage([string]$LangTag) {
    $lang = New-Object Windows.Globalization.Language($LangTag)
    if (-not [Windows.Media.Ocr.OcrEngine]::IsLanguageSupported($lang)) {
        Write-Warning "Le pack OCR pour la langue '$LangTag' n'est pas installé sur cette machine."
        Write-Warning "Réglages > Heure et langue > Langue et région > Ajouter une langue, puis activer 'Reconnaissance optique de caractères'."
        Write-Warning "Bascule sur le moteur OCR par défaut du profil utilisateur..."
        return [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    }
    return [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
}

function Get-TextFromSoftwareBitmap($SoftwareBitmap, $OcrEngine) {
    $ocrResult = Await ($OcrEngine.RecognizeAsync($SoftwareBitmap)) ([Windows.Media.Ocr.OcrResult])
    return $ocrResult.Text
}

function Get-SoftwareBitmapFromImageFile([string]$ImagePath) {
    $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($ImagePath)) ([Windows.Storage.StorageFile])
    $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $stream.Dispose()
    return $bitmap
}

# --- OCR sur une image simple (PNG/JPG/BMP/TIF) ----------------------------

function Invoke-OcrOnImage([string]$ImagePath, $OcrEngine) {
    $bitmap = Get-SoftwareBitmapFromImageFile $ImagePath
    $text = Get-TextFromSoftwareBitmap $bitmap $OcrEngine
    return $text
}

# --- OCR sur un PDF (rendu page par page puis OCR) -------------------------

function Invoke-OcrOnPdf([string]$PdfPath, $OcrEngine, [int]$Dpi) {
    [Windows.Data.Pdf.PdfDocument, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null

    $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($PdfPath)) ([Windows.Storage.StorageFile])
    $pdfDoc = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])

    $allText = New-Object System.Text.StringBuilder
    $pageCount = $pdfDoc.PageCount
    $scale = $Dpi / 96.0   # 96 DPI = résolution de référence WinRT

    for ($i = 0; $i -lt $pageCount; $i++) {
        Write-Host "[info] OCR page $($i + 1)/$pageCount..." -ForegroundColor Cyan

        $page = $pdfDoc.GetPage([uint32]$i)

        $tempImg = [System.IO.Path]::Combine(
            [System.IO.Path]::GetTempPath(),
            "ocr_page_$i.png"
        )
        $tempFile = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync(
            (New-Item -ItemType File -Path $tempImg -Force).FullName
        )) ([Windows.Storage.StorageFile])

        $stream = Await ($tempFile.OpenAsync([Windows.Storage.FileAccessMode]::ReadWrite)) ([Windows.Storage.Streams.IRandomAccessStream])

        $renderOptions = New-Object Windows.Data.Pdf.PdfPageRenderOptions
        $renderOptions.DestinationWidth  = [uint32]($page.Size.Width  * $scale)
        $renderOptions.DestinationHeight = [uint32]($page.Size.Height * $scale)

        Await-Action ($page.RenderToStreamAsync($stream, $renderOptions))
        $stream.Dispose()
        $page.Dispose()

        $bitmap = Get-SoftwareBitmapFromImageFile $tempImg
        $pageText = Get-TextFromSoftwareBitmap $bitmap $OcrEngine

        [void]$allText.AppendLine("--- Page $($i + 1) ---")
        [void]$allText.AppendLine($pageText)
        [void]$allText.AppendLine()

        Remove-Item $tempImg -ErrorAction SilentlyContinue
    }

    return $allText.ToString()
}

# --- Exécution principale ---------------------------------------------------

Write-Host "[info] Chargement du moteur OCR (langue: $Language)..." -ForegroundColor Cyan
$engine = Get-OcrEngineForLanguage $Language

if (-not $engine) {
    Write-Error "Impossible d'initialiser le moteur OCR. Vérifie qu'un pack de langue OCR est installé."
    exit 1
}

$text = switch ($ext) {
    ".pdf" { Invoke-OcrOnPdf $Path $engine $Dpi }
    default { Invoke-OcrOnImage $Path $engine }
}

Set-Content -Path $OutputPath -Value $text -Encoding UTF8

Write-Host "[ok] OCR terminé." -ForegroundColor Green
Write-Host "[ok] Texte écrit dans : $OutputPath" -ForegroundColor Green
Write-Host "[ok] $($text.Length) caractères extraits." -ForegroundColor Green
