#!/usr/bin/env python3
"""
scrape_solfa_pdfs.py — Télécharge les PDF de solfa.mg.

Récupère https://www.solfa.mg/media/tiona/<set>/<n>.pdf pour n = start..end
et les enregistre dans un dossier local.

Usage :
    python scrape_solfa_pdfs.py                       # ff/1.pdf -> ff/60.pdf
    python scrape_solfa_pdfs.py --start 1 --end 60
    python scrape_solfa_pdfs.py --set ff --out downloads
    python scrape_solfa_pdfs.py --workers 8           # téléchargements parallèles
"""

import argparse
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

BASE = "https://www.solfa.mg/media/tiona"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) scrape_solfa_pdfs/1.0"


def download_one(n: int, set_name: str, out_dir: Path, timeout: int, retries: int) -> tuple[int, str]:
    """Télécharge un PDF. Retourne (n, status)."""
    url = f"{BASE}/{set_name}/{n}.pdf"
    dest = out_dir / f"{n}.pdf"

    if dest.exists() and dest.stat().st_size > 0:
        return n, "skip (déjà présent)"

    for attempt in range(1, retries + 1):
        try:
            req = Request(url, headers={"User-Agent": UA})
            with urlopen(req, timeout=timeout) as resp:
                data = resp.read()
            ctype = resp.headers.get("Content-Type", "")
            if b"%PDF" not in data[:1024] and "pdf" not in ctype.lower():
                return n, f"ignoré (pas un PDF, Content-Type={ctype})"
            dest.write_bytes(data)
            return n, f"ok ({len(data)} octets)"
        except HTTPError as e:
            if e.code == 404:
                return n, "404 (inexistant)"
            last = f"HTTP {e.code}"
        except URLError as e:
            last = f"réseau: {e.reason}"
        except Exception as e:  # noqa: BLE001
            last = str(e)
        if attempt < retries:
            time.sleep(1.5 * attempt)
    return n, f"échec après {retries} essais ({last})"


def main():
    p = argparse.ArgumentParser(description="Télécharge des PDF depuis solfa.mg")
    p.add_argument("--set", default="ff", help="Sous-dossier du média (défaut: ff)")
    p.add_argument("--start", type=int, default=1, help="Premier numéro (défaut: 1)")
    p.add_argument("--end", type=int, default=60, help="Dernier numéro inclus (défaut: 60)")
    p.add_argument("--out", default=None, help="Dossier de sortie (défaut: <set>_pdfs)")
    p.add_argument("--workers", type=int, default=4, help="Téléchargements parallèles (défaut: 4)")
    p.add_argument("--timeout", type=int, default=30, help="Timeout par requête en s (défaut: 30)")
    p.add_argument("--retries", type=int, default=3, help="Nombre d'essais par fichier (défaut: 3)")
    args = p.parse_args()

    out_dir = Path(args.out) if args.out else Path(f"{args.set}_pdfs")
    out_dir.mkdir(parents=True, exist_ok=True)

    numbers = range(args.start, args.end + 1)
    total = len(numbers)
    print(f"[info] Cible : {BASE}/{args.set}/{args.start}.pdf .. {args.end}.pdf")
    print(f"[info] Sortie : {out_dir.resolve()}  ({total} fichiers, {args.workers} workers)")

    ok = skip = fail = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {
            pool.submit(download_one, n, args.set, out_dir, args.timeout, args.retries): n
            for n in numbers
        }
        for fut in as_completed(futures):
            n = futures[fut]
            _, status = fut.result()
            print(f"  [{n:>3}] {status}")
            if status.startswith("ok"):
                ok += 1
            elif status.startswith("skip"):
                skip += 1
            else:
                fail += 1

    print(f"\n[résumé] ok={ok}  skip={skip}  échec/absent={fail}  total={total}")
    sys.exit(0 if fail == 0 else 1)


if __name__ == "__main__":
    main()
