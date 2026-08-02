#!/usr/bin/env python3
"""
pdf2txt.py — Extrait le texte des PDF d'un dossier en .txt (un PDF = un .txt).

Ces PDF (solfa.mg) contiennent une COUCHE TEXTE native (la notation solfa est du
vrai texte sélectionnable, pas une image). On extrait donc directement le texte —
pas d'OCR nécessaire, résultat propre et fidèle.

Stratégie par fichier :
  1. pdftotext (Poppler) si dispo  -> meilleur décodage Unicode (ô, é, ...).
  2. sinon pypdf.
  3. OCR (pytesseract) seulement si AUCUN texte natif (vrai PDF-image).

Usage :
    python pdf2txt.py                         # ./ff_pdfs -> ./ff_txt
    python pdf2txt.py --in ff_pdfs --out ff_txt
    python pdf2txt.py --in antema --out antema_txt --force
    python pdf2txt.py --in ff_pdfs --engine pypdf
"""

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path


def normalize(text: str) -> str:
    """Réduit les espaces multiples (paroles) à un seul, supprime les espaces de
    fin de ligne et les lignes vides superflues. Les lignes de notes (espaces
    simples) ne sont pas affectées."""
    lines = []
    for ln in text.splitlines():
        ln = re.sub(r"[ \t]{2,}", " ", ln).rstrip()
        lines.append(ln)
    out = "\n".join(lines)
    return re.sub(r"\n{3,}", "\n\n", out).strip() + "\n"


def find_pdftotext() -> str | None:
    """Localise pdftotext (PATH ou installation winget Poppler)."""
    exe = shutil.which("pdftotext")
    if exe:
        return exe
    for pat in (
        Path.home()
        / "AppData/Local/Microsoft/WinGet/Packages",
    ):
        if pat.exists():
            hits = list(pat.glob("*Poppler*/**/pdftotext.exe"))
            if hits:
                return str(hits[0])
    return None


PDFTOTEXT = find_pdftotext()


def extract_pdftotext(pdf: Path) -> str:
    """Extraction via Poppler pdftotext (ordre de lecture, UTF-8)."""
    out = subprocess.run(
        [PDFTOTEXT, "-enc", "UTF-8", "-nopgbrk", str(pdf), "-"],
        capture_output=True,
    )
    return out.stdout.decode("utf-8", errors="replace")


def extract_pypdf(pdf: Path) -> str:
    from pypdf import PdfReader

    reader = PdfReader(str(pdf))
    if reader.is_encrypted:
        # Beaucoup de PDF solfa.mg sont chiffrés avec un mot de passe VIDE
        # (verrou propriétaire) — déchiffrables sans mot de passe.
        reader.decrypt("")
    return "\n".join((p.extract_text() or "") for p in reader.pages)


def ocr_fallback(pdf: Path, lang: str, dpi: int) -> str:
    import pytesseract
    from pdf2image import convert_from_path

    parts = []
    for i, img in enumerate(convert_from_path(str(pdf), dpi=dpi), 1):
        parts.append(pytesseract.image_to_string(img, lang=lang))
    return "\n".join(parts)


def extract(pdf: Path, engine: str, lang: str, dpi: int) -> tuple[str, str]:
    """Retourne (texte normalisé, méthode).

    Ordre 'auto' : pypdf d'abord — il conserve chaque ligne de voix sur UNE seule
    ligne (fidèle à la partition). pdftotext (mode défaut) éclate les rangées de
    notes, on ne l'utilise donc qu'en repli. OCR en tout dernier (PDF-image)."""
    text, method = "", ""

    if engine in ("auto", "pypdf"):
        try:
            text, method = extract_pypdf(pdf), "pypdf"
        except Exception as e:  # noqa: BLE001
            print(f"    [warn] pypdf: {e}", file=sys.stderr)

    if engine in ("auto", "pdftotext") and len(text.strip()) < 20 and PDFTOTEXT:
        text, method = extract_pdftotext(pdf), "pdftotext"

    if engine in ("auto", "ocr") and len(text.strip()) < 20:
        try:
            text, method = ocr_fallback(pdf, lang, dpi), "ocr"
        except Exception as e:  # noqa: BLE001
            print(f"    [warn] ocr indisponible: {e}", file=sys.stderr)

    return normalize(text), method or "vide"


def main():
    p = argparse.ArgumentParser(description="PDF (couche texte) -> .txt par lot.")
    p.add_argument("--in", dest="indir", default="ff_pdfs", help="Dossier source (défaut: ff_pdfs)")
    p.add_argument("--out", dest="outdir", default=None, help="Dossier de sortie (défaut: <in>_txt)")
    p.add_argument("--engine", choices=["auto", "pdftotext", "pypdf", "ocr"], default="auto",
                   help="Moteur d'extraction (défaut: auto)")
    p.add_argument("--lang", default="fra", help="Langue OCR si fallback (défaut: fra)")
    p.add_argument("--dpi", type=int, default=300, help="DPI OCR si fallback (défaut: 300)")
    p.add_argument("--force", action="store_true", help="Réécrire les .txt existants")
    args = p.parse_args()

    indir = Path(args.indir)
    if not indir.is_dir():
        print(f"[erreur] Dossier introuvable : {indir}", file=sys.stderr)
        sys.exit(1)
    outdir = Path(args.outdir) if args.outdir else Path(f"{indir.name}_txt")
    outdir.mkdir(parents=True, exist_ok=True)

    def sort_key(p: Path):
        return (0, int(p.stem)) if p.stem.isdigit() else (1, p.stem)

    pdfs = sorted(indir.glob("*.pdf"), key=sort_key)
    print(f"[info] {len(pdfs)} PDF dans {indir} -> {outdir}")
    print(f"[info] pdftotext: {'oui' if PDFTOTEXT else 'non'} | engine={args.engine}\n")

    ok = skip = fail = 0
    for pdf in pdfs:
        dest = outdir / (pdf.stem + ".txt")
        if dest.exists() and not args.force:
            print(f"  [skip] {pdf.name}")
            skip += 1
            continue
        text, method = extract(pdf, args.engine, args.lang, args.dpi)
        if len(text.strip()) < 20:
            print(f"  [fail] {pdf.name} (aucun texte, méthode={method})")
            fail += 1
            continue
        dest.write_text(text, encoding="utf-8")
        print(f"  [ok]   {pdf.name} -> {dest.name}  ({len(text)} car., {method})")
        ok += 1

    print(f"\n[résumé] ok={ok}  skip={skip}  fail={fail}  total={len(pdfs)}")
    sys.exit(0 if fail == 0 else 1)


if __name__ == "__main__":
    main()
