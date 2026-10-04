#!/usr/bin/env python3
"""
One-time export: Supabase `puzzles` table -> Dropbox /study/chess/<category>.csv

Dropbox /study/chess is the source of truth for the fen saver's puzzles (one CSV
per category, columns fen,note, rows in puzzle order). This writes the current
Supabase puzzles out as those CSVs so "⇅ Sync from Dropbox" starts from them.

Existing CSVs are never overwritten (use --force to replace them).

Usage:
    python export_puzzles_to_dropbox.py --dry-run   # show what would be written
    python export_puzzles_to_dropbox.py             # write the CSVs
    python export_puzzles_to_dropbox.py --out ~/somewhere/else

Env vars (export them in ~/.secrets, loaded by ~/.zshrc):
    CHESS_SUPABASE_URL=https://xxxx.supabase.co
    CHESS_SUPABASE_SERVICE_ROLE_KEY=<service_role key>   (RLS has no anon policies)
"""

import argparse
import csv
import io
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_OUT = "~/Library/CloudStorage/Dropbox/study/chess"
PAGE = 1000  # Supabase returns at most 1000 rows per request


def fetch_puzzles(url: str, key: str) -> list[dict]:
    rows, offset = [], 0
    while True:
        q = ("puzzles?select=id,category,fen,note,position"
             "&order=category.asc,position.asc.nullslast,id.asc"
             f"&limit={PAGE}&offset={offset}")
        req = urllib.request.Request(f"{url}/rest/v1/{q}", headers={"apikey": key, "Authorization": f"Bearer {key}"})
        try:
            with urllib.request.urlopen(req) as r:
                batch = json.loads(r.read())
        except urllib.error.HTTPError as e:
            sys.exit(f"Supabase request failed: {e.code} {e.read().decode()[:300]}")
        except urllib.error.URLError as e:
            sys.exit(f"Can't reach Supabase at {url}: {e.reason}")
        rows += batch
        if len(batch) < PAGE:
            return rows
        offset += PAGE


def to_csv(puzzles: list[dict]) -> str:
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")  # quotes cells with commas, quotes or line breaks (PGNs)
    w.writerow(["fen", "note"])
    for p in puzzles:
        w.writerow([(p.get("fen") or "").strip(), (p.get("note") or "").strip()])
    return buf.getvalue()


def main():
    ap = argparse.ArgumentParser(description="Export Supabase puzzles to Dropbox /study/chess CSVs.")
    ap.add_argument("--out", default=DEFAULT_OUT, help=f"output folder (default {DEFAULT_OUT})")
    ap.add_argument("--dry-run", action="store_true", help="show what would be written, write nothing")
    ap.add_argument("--force", action="store_true", help="overwrite CSVs that already exist")
    args = ap.parse_args()

    url = os.environ.get("CHESS_SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("CHESS_SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        sys.exit("Set CHESS_SUPABASE_URL and CHESS_SUPABASE_SERVICE_ROLE_KEY "
                 "(export them in ~/.secrets, then open a new terminal or `source ~/.zshrc`).")

    out = Path(args.out).expanduser()
    if not out.parent.is_dir():
        sys.exit(f"{out.parent} not found: is Dropbox running? (or pass --out)")

    puzzles = fetch_puzzles(url, key)
    by_cat: dict[str, list[dict]] = {}
    for p in puzzles:
        if (p.get("fen") or "").strip():
            by_cat.setdefault(p["category"], []).append(p)
    print(f"{len(puzzles)} puzzles in {len(by_cat)} categories\n")

    if not args.dry_run:
        out.mkdir(exist_ok=True)
    written = skipped = 0
    for category, rows in by_cat.items():
        # Same file-name rule as the fen saver page (chessCsvPath): / and \ -> -
        path = out / (re.sub(r"[/\\]", "-", category) + ".csv")
        if path.exists() and not args.force:
            print(f"  = {path.name}: already exists, left alone ({len(rows)} in Supabase)")
            skipped += 1
            continue
        print(f"  + {path.name}: {len(rows)} puzzle{'s' if len(rows) != 1 else ''}")
        if not args.dry_run:
            path.write_text(to_csv(rows), encoding="utf-8")
        written += 1

    where = out if not args.dry_run else f"{out} (dry run, nothing written)"
    print(f"\n{written} CSV(s) written, {skipped} left alone -> {where}")


if __name__ == "__main__":
    main()
