# Converts PDFs to .txt using pdftotext (poppler)
# Usage:
#   .\pdf2txt.ps1           -> converts all PDFs in this directory
#   .\pdf2txt.ps1 645.pdf   -> converts one specific PDF
# Run once: winget install oschwartz10612.poppler

param([string]$File = "")

# Find pdftotext.exe
$pdftotextExe = Get-Command pdftotext -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
if (-not $pdftotextExe) {
    $searchPaths = @(
        "C:\Program Files\poppler*",
        "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\oschwartz10612*"
    )
    foreach ($p in $searchPaths) {
        $found = Get-ChildItem $p -Recurse -Filter "pdftotext.exe" -ErrorAction SilentlyContinue |
                 Select-Object -First 1 -ExpandProperty FullName
        if ($found) { $pdftotextExe = $found; break }
    }
}
if (-not $pdftotextExe) {
    Write-Error "pdftotext not found. Run: winget install oschwartz10612.poppler"
    exit 1
}

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

if ($File) {
    $pdfs = @(Get-Item (Join-Path $dir $File) -ErrorAction Stop)
} else {
    $pdfs = Get-ChildItem -Path $dir -Filter "*.pdf"
}

if ($pdfs.Count -eq 0) {
    Write-Host "No PDFs found."
    exit
}

foreach ($pdf in $pdfs) {
    $txt = [System.IO.Path]::ChangeExtension($pdf.FullName, ".txt")
    Write-Host "Converting: $($pdf.Name) -> $([System.IO.Path]::GetFileName($txt))"
    & "$pdftotextExe" -layout "$($pdf.FullName)" "$txt"
}

Write-Host "Done. $($pdfs.Count) file(s) converted."
