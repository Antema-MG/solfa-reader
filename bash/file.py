#!/usr/bin/env python3
"""
ocr_pdf_to_txt.py — Convertit un PDF (scanné ou natif) en fichier .txt via OCR.

Stratégie :
1. Tente d'abord l'extraction de texte natif (pypdf) — rapide, parfait si le PDF
    contient déjà du texte sélectionnable.
2. Si le texte natif est vide/trop court (PDF scanné = image), bascule en OCR :
    conversion PDF -> images (pdf2image/poppler) puis OCR (pytesseract/Tesseract).

Installation requise :
    pip install pytesseract pdf2image pypdf --break-system-packages
    # + binaires système : tesseract-ocr, poppler-utils (souvent déjà présents)
    #   Ubuntu/Debian : sudo apt-get install tesseract-ocr poppler-utils
    #   Pour le malgache/français, installer aussi les packs de langue Tesseract :
    #   sudo apt-get install tesseract-ocr-fra   (le malgache n'a pas de pack officiel
    #   -> utiliser 'fra' ou 'eng' comme approximation, ou entraîner un modèle custom)

Usage :
    python ocr_pdf_to_txt.py input.pdf
    python ocr_pdf_to_txt.py input.pdf -o output.txt
    python ocr_pdf_to_txt.py input.pdf --lang fra
    python ocr_pdf_to_txt.py input.pdf --force-ocr   # ignore le texte natif, force l'OCR
    python ocr_pdf_to_txt.py input.pdf --dpi 400      # meilleure résolution pour petites polices
"""

import argparse
import sys
from pathlib import Path


def extract_native_text(pdf_path: str) -> str:
    """Tente l'extraction de texte natif (PDF non scanné)."""
    try:
        from pypdf import PdfReader

        reader = PdfReader(pdf_path)
        pages_text = []
        for page in reader.pages:
            pages_text.append(page.extract_text() or "")
        return "\n\n".join(pages_text)
    except Exception as e:
        print(f"[info] Extraction native impossible : {e}", file=sys.stderr)
        return ""


def ocr_pdf(pdf_path: str, lang: str = "eng", dpi: int = 300) -> str:
    """OCR complet : PDF -> images -> texte via Tesseract."""
    import pytesseract
    from pdf2image import convert_from_path

    print(f"[info] Conversion du PDF en images (dpi={dpi})...", file=sys.stderr)
    images = convert_from_path(pdf_path, dpi=dpi)

    full_text = []
    for i, image in enumerate(images, start=1):
        print(f"[info] OCR page {i}/{len(images)}...", file=sys.stderr)
        page_text = pytesseract.image_to_string(image, lang=lang)
        full_text.append(f"--- Page {i} ---\n{page_text}")

    return "\n\n".join(full_text)


def main():
    parser = argparse.ArgumentParser(
        description="Convertit un PDF (texte natif ou scanné) en .txt via OCR si nécessaire."
    )
    parser.add_argument("pdf_path", help="Chemin du fichier PDF source")
    parser.add_argument(
        "-o",
        "--output",
        help="Chemin du fichier .txt de sortie (défaut : même nom que le PDF)",
    )
    parser.add_argument(
        "--lang",
        default="eng",
        help="Code langue Tesseract (ex: eng, fra, fra+eng). Défaut : eng",
    )
    parser.add_argument(
        "--dpi",
        type=int,
        default=300,
        help="Résolution de rendu des pages avant OCR (défaut : 300, monter à 400-600 "
        "pour les petites polices ou les partitions denses)",
    )
    parser.add_argument(
        "--force-ocr",
        action="store_true",
        help="Ignore le texte natif et force le passage par OCR",
    )
    parser.add_argument(
        "--min-native-chars",
        type=int,
        default=20,
        help="Seuil de caractères natifs en dessous duquel on bascule en OCR (défaut : 20)",
    )
    args = parser.parse_args()

    pdf_path = Path(args.pdf_path)
    if not pdf_path.exists():
        print(f"[erreur] Fichier introuvable : {pdf_path}", file=sys.stderr)
        sys.exit(1)

    output_path = Path(args.output) if args.output else pdf_path.with_suffix(".txt")

    text = ""
    used_ocr = False

    if not args.force_ocr:
        text = extract_native_text(str(pdf_path))

    if args.force_ocr or len(text.strip()) < args.min_native_chars:
        print(
            "[info] Texte natif absent/insuffisant -> bascule en OCR.", file=sys.stderr
        )
        text = ocr_pdf(str(pdf_path), lang=args.lang, dpi=args.dpi)
        used_ocr = True
    else:
        print("[info] Texte natif trouvé, OCR non nécessaire.", file=sys.stderr)

    output_path.write_text(text, encoding="utf-8")

    print(f"[ok] {'OCR' if used_ocr else 'Extraction native'} terminé(e).")
    print(f"[ok] Texte écrit dans : {output_path}")
    print(f"[ok] {len(text)} caractères extraits.")


if __name__ == "__main__":
    main()
