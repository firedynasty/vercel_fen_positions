#!/usr/bin/env python3
"""
Back up / bulk edit the Supabase `puzzles` table as one CSV per category.

Supabase `puzzles` is the only source of truth. This script moves puzzles between
the table and a folder of CSVs (default: the locally synced Dropbox folder, so
there is no Dropbox API and no sign-in). One file per category, named
<category>.csv, header `fen,note`, rows in puzzle order.

Exactly one of:
    --download   Supabase -> <category>.csv for every category in Supabase.
                 Overwrites files whose content changed. Files for categories
                 that no longer exist in Supabase are left alone (and listed).
                 Never deletes files.
    --upload     CSVs -> Supabase. Reads every *.csv (category = file name),
                 skips rows with an empty fen, position = row number in the file.
                 Rows are matched by FEN (same category first, then any category)
                 so a matched puzzle keeps its id; unmatched CSV rows are inserted;
                 category / note / position are updated when they differ; table
                 rows that match no CSV row are DELETED. Refuses to run if the
                 CSVs hold zero puzzles (an empty read must never wipe the table).

Options:
    --dry-run    print the plan only, change nothing
    --yes        skip the confirmation (otherwise always asks; --upload prints the
                 rows to be deleted before asking)
    --dir PATH   use another folder (default ~/Library/CloudStorage/Dropbox/study/chess)

Usage:
    python puzzles_csv.py --download --dry-run
    python puzzles_csv.py --download
    python puzzles_csv.py --upload --dry-run
    python puzzles_csv.py --upload

Env vars (export them in ~/.secrets, loaded by ~/.zshrc):
    CHESS_SUPABASE_URL=https://xxxx.supabase.co
    CHESS_SUPABASE_SERVICE_ROLE_KEY=<service_role key>   (RLS has no anon policies)
    (falls back to SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)

Note: a category name containing / or \\ is written as a file name with - instead
(same rule the page used), so uploading it back would rename that category.
"""

import argparse
import csv
import io
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

DEFAULT_DIR = "~/Library/CloudStorage/Dropbox/study/chess"
PAGE = 1000      # Supabase returns at most 1000 rows per request
BATCH = 200      # rows per insert / ids per delete request

csv.field_size_limit(2**31 - 1)  # a PGN cell can be long


# ---------------------------------------------------------------- Supabase

def env_config() -> tuple[str, str]:
    url = (os.environ.get("CHESS_SUPABASE_URL") or os.environ.get("SUPABASE_URL") or "").rstrip("/")
    key = os.environ.get("CHESS_SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    if not url or not key:
        sys.exit("Set CHESS_SUPABASE_URL and CHESS_SUPABASE_SERVICE_ROLE_KEY "
                 "(or SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY); export them in ~/.secrets, "
                 "then open a new terminal or `source ~/.zshrc`.")
    return url, key


def request(url: str, key: str, method: str, path: str, body=None, prefer: str | None = None):
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    if prefer:
        headers["Prefer"] = prefer
    req = urllib.request.Request(f"{url}/rest/v1/{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        sys.exit(f"Supabase {method} {path.split('?')[0]} failed: {e.code} {e.read().decode()[:300]}")
    except urllib.error.URLError as e:
        sys.exit(f"Can't reach Supabase at {url}: {e.reason}")


def fetch_puzzles(url: str, key: str, order: str) -> list[dict]:
    rows, offset = [], 0
    while True:
        q = f"puzzles?select=id,category,fen,note,position&order={order}&limit={PAGE}&offset={offset}"
        batch = request(url, key, "GET", q)
        rows += batch
        if len(batch) < PAGE:
            return rows
        offset += PAGE


# --------------------------------------------------------------------- CSV

def csv_name(category: str) -> str:
    return re.sub(r"[/\\]", "-", category) + ".csv"


def to_csv(puzzles: list[dict]) -> str:
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")  # quotes cells with commas, quotes or line breaks (PGNs)
    w.writerow(["fen", "note"])
    for p in puzzles:
        w.writerow([(p.get("fen") or "").strip(), (p.get("note") or "").strip()])
    return buf.getvalue()


def read_csv_rows(path: Path) -> list[dict]:
    """-> [{fen, note}] in file order; header and empty-fen rows skipped."""
    with open(path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    if rows and rows[0] and rows[0][0].strip().lower() == "fen":
        rows.pop(0)
    out = []
    for r in rows:
        fen = (r[0] if r else "").strip()
        if fen:
            out.append({"fen": fen, "note": (r[1] if len(r) > 1 else "").strip()})
    return out


def confirm(question: str, assume_yes: bool) -> bool:
    if assume_yes:
        return True
    return input(f"{question} [y/N] ").strip().lower() in ("y", "yes")


# ---------------------------------------------------------------- download

def do_download(url: str, key: str, out: Path, dry_run: bool, yes: bool, is_default_dir: bool):
    if is_default_dir and not out.parent.is_dir():
        sys.exit(f"{out.parent} not found: is Dropbox running? (or pass --dir)")

    puzzles = fetch_puzzles(url, key, "category.asc,position.asc.nullslast,id.asc")
    by_cat: dict[str, list[dict]] = {}
    for p in puzzles:
        if p.get("category") and (p.get("fen") or "").strip():
            by_cat.setdefault(p["category"], []).append(p)
    print(f"{len(puzzles)} puzzles in {len(by_cat)} categories in Supabase -> {out}\n")

    plan = []  # (path, text, status)
    for category, rows in by_cat.items():
        path = out / csv_name(category)
        text = to_csv(rows)
        if not path.exists():
            status = "new"
        else:
            with open(path, newline="", encoding="utf-8") as f:
                status = "unchanged" if f.read() == text else "changed"
        plan.append((path, text, status, len(rows)))

    for path, _, status, n in plan:
        mark = {"new": "+", "changed": "~", "unchanged": "="}[status]
        print(f"  {mark} {path.name}: {n} puzzle{'s' if n != 1 else ''} ({status})")

    wanted = {p.name for p, *_ in plan}
    orphans = sorted(f.name for f in out.glob("*.csv") if f.name not in wanted) if out.is_dir() else []
    if orphans:
        print("\nCSVs with no category in Supabase (left alone, never deleted):")
        for name in orphans:
            print(f"  ? {name}")

    to_write = [(p, t) for p, t, s, _ in plan if s != "unchanged"]
    print(f"\n{len(to_write)} file(s) to write, {len(plan) - len(to_write)} unchanged")
    if dry_run:
        print("(dry run, nothing written)")
        return
    if not to_write:
        return
    if not confirm(f"Write {len(to_write)} file(s) into {out}?", yes):
        print("Cancelled.")
        return
    out.mkdir(parents=True, exist_ok=True)
    for path, text in to_write:
        with open(path, "w", newline="", encoding="utf-8") as f:
            f.write(text)
    print(f"Wrote {len(to_write)} file(s).")


# ------------------------------------------------------------------ upload

def plan_upload(wanted: list[dict], existing: list[dict]) -> dict:
    """Same matching rules as the old syncPuzzles(): by FEN, same category first."""
    unused = {row["id"]: row for row in existing}  # dict keeps id order

    def take(pred):
        for rid, row in unused.items():
            if pred(row):
                del unused[rid]
                return row
        return None

    # Pass 1: same category + FEN. Pass 2: FEN moved to another category.
    matched = {}
    for i, w in enumerate(wanted):
        row = take(lambda e: e["category"] == w["category"] and (e["fen"] or "").strip() == w["fen"])
        if row:
            matched[i] = row
    inserts, updates = [], []
    for i, w in enumerate(wanted):
        row = matched.get(i) or take(lambda e: (e["fen"] or "").strip() == w["fen"])
        if not row:
            inserts.append(w)
            continue
        patch = {}
        if row["category"] != w["category"]:
            patch["category"] = w["category"]
        if (row["note"] or None) != w["note"]:
            patch["note"] = w["note"]
        if row["position"] != w["position"]:
            patch["position"] = w["position"]
        if patch:
            updates.append({"id": row["id"], "old": row, "patch": patch})
    return {"inserts": inserts, "updates": updates, "deletes": list(unused.values())}


def short(text: str | None, n: int = 40) -> str:
    return (text or "").replace("\n", " ")[:n]


def do_upload(url: str, key: str, src: Path, dry_run: bool, yes: bool):
    if not src.is_dir():
        sys.exit(f"{src} not found")
    files = sorted(src.glob("*.csv"))
    wanted = []
    for path in files:
        category = path.stem
        for i, r in enumerate(read_csv_rows(path), start=1):
            wanted.append({"category": category, "fen": r["fen"], "note": r["note"] or None, "position": i})
    # An empty read must never wipe the table.
    if not wanted:
        sys.exit(f"No puzzles in the {len(files)} CSV(s) in {src}; refusing to delete everything.")

    existing = fetch_puzzles(url, key, "id.asc")
    plan = plan_upload(wanted, existing)
    ins, upd, dele = plan["inserts"], plan["updates"], plan["deletes"]

    print(f"{len(files)} CSVs, {len(wanted)} puzzles in {src}; {len(existing)} puzzles in Supabase\n")
    print(f"+{len(ins)} add  ~{len(upd)} update  -{len(dele)} delete")
    for w in ins[:10]:
        print(f"  + {w['category']}: {short(w['note'] or w['fen'])}")
    if len(ins) > 10:
        print(f"  + … {len(ins) - 10} more")
    for u in upd[:10]:
        print(f"  ~ #{u['id']} {u['old']['category']}: " + ", ".join(
            f"{k} {u['old'][k]!r:.30} -> {v!r:.30}" for k, v in u["patch"].items()))
    if len(upd) > 10:
        print(f"  ~ … {len(upd) - 10} more")
    if dele:
        print("\nRows to be DELETED (match no CSV row):")
        for d in dele:
            print(f"  - #{d['id']} {d['category']}: {short(d['note'] or d['fen'])}")

    if dry_run:
        print("\n(dry run, nothing changed)")
        return
    if not (ins or upd or dele):
        print("\nSupabase already matches the CSVs.")
        return
    if not confirm(f"\nApply to Supabase (+{len(ins)} ~{len(upd)} -{len(dele)})?", yes):
        print("Cancelled.")
        return

    ids = [d["id"] for d in dele]
    for i in range(0, len(ids), BATCH):
        chunk = ",".join(str(x) for x in ids[i:i + BATCH])
        request(url, key, "DELETE", f"puzzles?id=in.({chunk})", prefer="return=minimal")
    for u in upd:
        request(url, key, "PATCH", f"puzzles?id=eq.{u['id']}", body=u["patch"], prefer="return=minimal")
    for i in range(0, len(ins), BATCH):
        request(url, key, "POST", "puzzles", body=ins[i:i + BATCH], prefer="return=minimal")
    print(f"Done: +{len(ins)} ~{len(upd)} -{len(dele)}.")


# -------------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description="Back up / bulk edit Supabase puzzles as one CSV per category.")
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--download", action="store_true", help="Supabase -> <category>.csv files")
    mode.add_argument("--upload", action="store_true", help="CSV files -> Supabase (deletes rows missing from the CSVs)")
    ap.add_argument("--dry-run", action="store_true", help="print the plan only, change nothing")
    ap.add_argument("--yes", action="store_true", help="skip the confirmation prompt")
    ap.add_argument("--dir", default=DEFAULT_DIR, help=f"CSV folder (default {DEFAULT_DIR})")
    args = ap.parse_args()

    url, key = env_config()
    folder = Path(args.dir).expanduser()
    if args.download:
        do_download(url, key, folder, args.dry_run, args.yes, args.dir == DEFAULT_DIR)
    else:
        do_upload(url, key, folder, args.dry_run, args.yes)


if __name__ == "__main__":
    main()
