# How the Supabase puzzle feature works

Save the position (or whole PGN) on the board to a Supabase table, group it into categories, add many at once by pasting rows, and load, step through, and delete it later.

Everything here is described from the code as it runs today: `api/puzzles.js` (server) and the `sb…` functions plus the "Supabase Puzzles" section in `index.html` (browser).

> **Source of truth: the Supabase `puzzles` table.** The page saves, bulk-adds and deletes in Supabase only, and nothing syncs from files automatically. For a backup, or to bulk edit in a spreadsheet or text editor, use the local script `puzzles_csv.py`, which moves puzzles to and from one CSV per category. See section 12.

---

## 1. Big picture

```
browser (index.html)                 Vercel function                  Supabase
┌───────────────────────┐   fetch   ┌──────────────────┐   REST     ┌──────────────┐
│ Supabase Puzzles panel│ ────────▶ │ /api/puzzles     │ ─────────▶ │ table        │
│  sbSavePuzzle()       │           │ (api/puzzles.js) │  service   │ `puzzles`    │
│  sbLoadPuzzles…()     │ ◀──────── │ holds the secret │  role key  │              │
│  sbBulkAdd()          │   JSON    │ key server-side  │ ◀───────── │              │
│  sbDeletePuzzle()     │           │                  │            │              │
└───────────────────────┘           └──────────────────┘            └──────────────┘
```

- The browser **never** sees the Supabase key. It only calls `/api/puzzles`.
- The function uses the **service-role key**, which bypasses row-level security. That is why the table has no RLS policies for anon/authenticated users (see section 8).
- One row = one puzzle. A puzzle is either a **single FEN** or a **whole PGN** (see section 3).

---

## 2. Setup

### Environment variables (Vercel → Project → Settings → Environment Variables)

| Name | Value |
|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | the project's `service_role` key (not the anon key) |
| `ACCESS_CODE` | a code you choose. Every write (save, bulk add, delete) must send it in the `X-Access-Code` header. Reading needs no code. |

For local work run `vercel dev` (a plain static server, like `npm run dev`, has no `/api`), with the variables in `.env.local`. If either Supabase variable is missing, every call returns `500 {"error":"Supabase env vars not set on server."}`. If `ACCESS_CODE` is missing, every write returns `500 {"error":"ACCESS_CODE not set on server."}` (it fails closed, there is no default code).

### Table: `puzzles`

The table definition is **not stored in this repo**, so this is what the code requires, not a copy of your DDL. Check it against the Supabase table editor.

| Column | Used for | Notes |
|---|---|---|
| `id` | row id | integer, primary key. Used by "get" and "delete". Delete only accepts digits. |
| `category` | grouping | text. The browse dropdown is built from the distinct values. |
| `note` | hint text | text, nullable. Shown by **👁 Reveal Note**. |
| `fen` | the position | **text**. A plain FEN *or* a full PGN with a `[FEN "…"]` header. Must be `text` (or another unbounded type), because a PGN can be long. |
| `position` | order inside a category | integer, nullable. See "Ordering" below. |
| `created_at` | timestamp | returned by the list call. |

`position` was added later. The code comment says to add it with:

```sql
alter table puzzles add column position integer;
update puzzles set position = id;
```

If this column does not exist, the **list** call fails, because `position` is in its `select` list (see section 9).

### Ordering

- The list is sorted by `position` ascending (rows with no position last), then `id`.
- A new save gets `position = (highest position in that category) + 1` (1 if the category is empty), so new puzzles go to the end. A bulk add numbers its rows from there, in order.
- Deleting a puzzle leaves a gap in the numbers. That is fine, the sort order still works.
- To reorder, edit the category's CSV and run `python puzzles_csv.py --upload`: `position` becomes each row's line number (see section 12).

---

## 3. What is stored in `fen`

The `fen` column holds one of two things, and the page tells them apart by a single rule:

> **If the text contains `[FEN "` it is a PGN. Otherwise it is a plain FEN.**   (`sbIsPgn()`)

**Plain FEN**, a single position:
```
1k1q4/1pp2rQ1/8/3p3p/p2PpB2/2P1P2P/PP4P1/6K1 w - - 0 1
```

**PGN**, a start position plus the moves played from it (Lichess "From Position" format):
```
[Variant "From Position"]
[FEN "1k1q4/1pp2rQ1/8/3p3p/p2PpB2/2P1P2P/PP4P1/6K1 w - - 0 1"]

1. Qxf7 b5 2. Qxh5 a3
```

Moves in a saved PGN may include illegal ones (the board allows any move). When a PGN is loaded, legal moves are replayed with chess.js and illegal ones are applied as written, so nothing is skipped (`replayPgnRelaxed()`).

---

## 4. The API: `/api/puzzles`

CORS is open (`Access-Control-Allow-Origin: *`) and allows `GET, POST, DELETE, OPTIONS` and the `Content-Type` and `X-Access-Code` headers.

**Writes need the access code.** `POST` and `DELETE` must send `X-Access-Code: <ACCESS_CODE>`. A wrong or missing code returns `401 { "error": "Wrong access code" }`; a server with no `ACCESS_CODE` returns `500`. The check runs before anything else, so a rejected request touches nothing. `GET` needs no code.

### `GET /api/puzzles?action=categories`
Returns the distinct category names, sorted.
```json
["endgames", "mate_in_5"]
```

### `GET /api/puzzles?action=list&category=NAME`
Returns the puzzles in a category, ordered as in section 2. Leave out `category` to get every puzzle.
```json
[{ "id": 13, "category": "endgames", "note": "win a pawn", "fen": "…", "position": 1, "created_at": "…" }]
```

### `GET /api/puzzles?action=get&id=13`
Returns one puzzle with all columns. `400` if `id` is missing, `404` if there is no such row.

### `POST /api/puzzles` (action `save`)
Saves a puzzle. Needs the access code. Body:
```json
{ "action": "save", "category": "endgames", "note": "win a pawn", "fen": "<FEN or PGN text>" }
```
- `category` and `fen` are required (`400` if missing). `note` is optional.
- The function looks up the category's highest `position` first and stores `position = highest + 1`.
- Response: `200 { "success": true, "puzzle": { …the new row… } }`.

### `POST /api/puzzles` (action `bulk`)
Adds many puzzles to one category in one request. Needs the access code. Body:
```json
{ "action": "bulk", "category": "white_blunder", "rows": [{ "fen": "<FEN or PGN text>", "note": "…" }] }
```
- `category` and at least one row with a `fen` are required (`400` otherwise). Rows with an empty `fen` are dropped.
- Positions continue after the category's highest `position`, in row order.
- Response: `200 { "success": true, "added": 3 }`.
- The server does not check for duplicates. The page skips rows already in the category before it sends them.

### `DELETE /api/puzzles?id=13`
Deletes one puzzle. Needs the access code.
- `id` must be all digits, otherwise `400 { "error": "A numeric id is required" }`. Nothing else can reach the Supabase query.
- `404 { "error": "Puzzle not found" }` if no row matched.
- `200 { "success": true, "deleted": 13 }` on success.

Any error Supabase returns is passed back with its own status code. Anything unexpected returns `500 { "error": "<message>" }`. Other methods return `405`.

---

## 5. The panel in the page

The section is titled **Supabase Puzzles** and has two rows.

### Browse row

| Control | What it does |
|---|---|
| **Category dropdown** | Lists the categories. Changing it loads that category's puzzles. |
| **Puzzle dropdown** | One entry per puzzle, e.g. `1 · FEN — 1k1q4/1pp2rQ1/8/3p…` or `3 ▶ PGN — 2k2r2/pppr1pQ1/…`. `· FEN` = plain FEN, `▶ PGN` = a saved PGN. The preview is the first 24 characters of the start FEN. Picking an entry loads it on the board. |
| **◀ Prev / Next ▶** | Move to the previous or next puzzle in the category and load it (**[ / ]** keys). They wrap around at both ends. Disabled until a category has loaded. |
| **👁 Reveal Note** | Shows or hides the puzzle's note. The note hides again whenever you load another puzzle. |

**What loading does**
- **Plain FEN:** the FEN goes into the FEN box and loads on the board, like Load on Board.
- **PGN:** the PGN is read into a move tree (variations and comments included), the start position is shown, and the **move navigator** under the board steps through it. The PGN text area is filled too, so dropping more pieces extends the line.

**Where things are:** the page has two side panes. **☰ Puzzles** (top left) opens this puzzle browser; **Tools ☰** (top right) holds the FEN / PGN tools: load an image, paste FEN or PGN, flip the board, the PGN recorder and Dictate PGN. Each pane opens and closes on its own and is remembered; on wide screens they push the board aside, on narrow ones they overlay it.

**Move navigator and keys** (under the board; it replaced the old Cycle Board buttons)

| Control | What it does |
|---|---|
| **← Back / Next →** (**←** / **→** keys, **Space** / **Shift+Space**) | Step along the current line. They stop at the ends (no wrap-around). |
| **⏮ / ⏭** | Jump to the start position / the end of the current line. |
| **Var ↓ / ↑ Out** (**↓** / **↑** keys) | **↓** steps into a variation: on a move that has variations it goes to the first one (again for the next). **↑** jumps back from a variation to the main-line move it branched from. The counter shows "line 2 of 3". |
| **Clicking a move** | Jumps there, in the main line or any variation. |
| **Comment panel** | Shows the current move's comment. |

Stepping back and forward again stays on the variation you were in. Dropping a piece on the board: if it is the move the line already has next, you just step into it; any other move replaces everything after that point (variations earlier in the line are kept). A PGN you did not edit is saved exactly as stored.

### Save / delete row

| Control | What it does |
|---|---|
| **Category dropdown** (save) | Pick an existing category or **+ New category…**. |
| **New category name box** | Appears only for **+ New category…**. |
| **Note box** | Optional hint text stored in `note`. |
| **💾 Save to Supabase** | Saves either the board's FEN or the whole PGN (rule below). |
| **🗑️ Delete Loaded FEN/PGN** | Deletes the puzzle selected in the puzzle dropdown, after a confirm dialog. |

A status line under the row shows "Saving…", "Saved FEN to …", "Saved PGN to …" or "Deleted …".

### Bulk add

Under the save row, **Bulk add rows (paste fen,note)** is a collapsed section with a textarea and an **➕ Add rows to Supabase** button.

- Paste one or many `fen,note` rows (CSV; the PGN in quotes, with `""` for a quote inside it). A `fen,note` header line is skipped.
- The category comes from the **save row's category dropdown** (or the new-category box when **+ New category…** is selected). The board and the Note box are not used.
- Every row needs two cells and a `[FEN "…"]` header in the first. If any row fails, nothing is added and the status line lists the row numbers.
- Rows already in that category, and repeats inside the paste, are skipped. A confirm shows how many will be added.

### Access code

Save, bulk add and delete ask for the access code the first time (a prompt) and remember it in this browser's `localStorage` (`puzzles_access_code`). A `401` clears the remembered code, so the next write asks again. Browsing needs no code.

---

## 6. Flows

### Save: what gets stored

```
click 💾
  ├─ a PGN cycle is active (more than one recorded/loaded position)?
  │     yes → fen = the whole PGN text ([Variant][FEN] header + moves)
  │     no  → fen = the text in the FEN box
  ├─ no category chosen  → toast "Enter a category name"
  ├─ nothing to save     → toast "No FEN on the board to save"
  └─ POST /api/puzzles { action:"save", category, note, fen }   (with the access code)
        → status "Saved PGN/FEN to <category>", clear the note box, reload the category list,
          re-select the category you saved into
```

The "cycle is active" rule matters: dropping moves on the board, or loading a PGN, makes a cycle. Loading a *new* FEN, or Clear PGN, ends it, so the next save is a single FEN again.

### Load

```
page opens / category changes
  → GET ?action=categories        (fills both category dropdowns)
  → GET ?action=list&category=X   (fills the puzzle dropdown, keeps the rows in memory)
  → the first puzzle loads on the board
pick a puzzle, or press Prev ◀ / Next ▶
  → no request: the list is already in memory (window.sbPuzzlesByCategory)
  → plain FEN → load on board;  PGN → load into the move tree (navigator under the board)
```

### Delete

```
click 🗑️ (a puzzle must be selected)
  → confirm("Delete this FEN/PGN puzzle from <category>? This cannot be undone.")
  → DELETE /api/puzzles?id=<id>   (with the access code)
  → reload categories, stay in the same category (unless it is now empty),
    reload the puzzle dropdown; the first remaining puzzle loads
```

Cancel in the dialog does nothing. There is no undo.

---

## 7. Where the code lives

**`api/puzzles.js`**: the whole server side (`categories`, `list`, `get`, `save`, `bulk`, `delete`, and the access-code check on the writes).

**`puzzles_csv.py`**: the local backup / bulk-edit script (section 12). It is not part of the web app.

**`index.html`**:

| Function | Purpose |
|---|---|
| `sbLoadCategories()` | Fills the browse and save category dropdowns; starts loading the first category. |
| `sbLoadPuzzlesForCategory()` | Fills the puzzle dropdown, tags each `· FEN` / `▶ PGN`, and loads the first puzzle. |
| `sbCurrentPuzzle()` | The puzzle object selected in the dropdown. |
| `sbLoadSelectedPuzzle()` | Loads the selected puzzle onto the board (FEN or PGN path). |
| `sbIsPgn(text)` / `sbPgnStartFen(text)` | Detect a PGN and pull its start FEN for the dropdown label. |
| `sbPrevPuzzle()` / `sbNextPuzzle()` | Step through the dropdown, with wrap-around. |
| `sbToggleNote()` / `sbHideNote()` | Reveal Note. |
| `sbToggleNewCategoryInput()` | Show the new-category box only for **+ New category…**. |
| `sbSavePuzzle()` | Save (single FEN or the whole PGN). |
| `sbParseBulk(text)` | Turn pasted `fen,note` CSV into rows (PapaParse) and report unreadable rows. |
| `sbBulkAdd()` / `sbBulkSave()` | Validate and de-duplicate the pasted rows, confirm, then send them as one `bulk` request. |
| `sbAccessCode()` / `sbWriteFetch()` | Ask for and remember the access code; every write goes through `sbWriteFetch`, which adds the header and handles `401`. |
| `sbDeletePuzzle()` | Confirm and delete. |

Related PGN pieces the feature depends on: `pgnAdoptFromText`, `replayPgnRelaxed`, `parseFenVariantToPositions`, `cycleBoard`, `cycleBoardPrev`, and the `cyclePositions` / `cyclePgnSource` variables.

---

## 8. Security notes

- The service-role key is only ever on the server. Keep `SUPABASE_SERVICE_ROLE_KEY` out of the repo and out of any client code.
- Reading is open: anyone who can reach `/api/puzzles` can list and read puzzles. **Writes** (save, bulk, delete) need the shared `ACCESS_CODE` in the `X-Access-Code` header; it is compared in constant time, a wrong code gets `401`, and a server with no code configured refuses all writes. The code is one shared secret, kept in the page's `localStorage` once entered, so treat it as a light lock, not a login. Keep `ACCESS_CODE` out of the repo.
- No web request can delete puzzles because of a CSV: the only thing that deletes rows in bulk is `python puzzles_csv.py --upload`, run by hand on your machine with the service-role key, and it asks first.
- `category` is passed into the Supabase query as `eq.<category>` by URL-encoding, and delete only takes digits. Do not build other query strings from raw user text without doing the same.
- Deletes are permanent. If you want an undo, switch to a soft delete (a `deleted_at` column that the list query filters out).

---

## 9. Troubleshooting

| Symptom | Likely cause |
|---|---|
| `500 Supabase env vars not set on server.` | `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing. Set it in Vercel (and redeploy) or in your `vercel dev` environment. |
| Categories load but the puzzle dropdown says "Failed to load" | The `position` column probably does not exist (the list request asks for it). Run the `alter table` from section 2. |
| `500 ACCESS_CODE not set on server.` | Set `ACCESS_CODE` in Vercel (and redeploy) or in `.env.local` for `vercel dev`. Saves, bulk adds and deletes are refused until it exists. |
| "Wrong access code: try again" (`401`) | The code you typed (or the one remembered in this browser) doesn't match the server's `ACCESS_CODE`. The remembered one is cleared; you are asked again on the next write. |
| Category dropdown says "Failed to load" | The `/api` route is not running (static server instead of `vercel dev`), or the env vars are wrong. Check the browser console and the network tab. |
| Saving a PGN fails with a length error | `fen` is a short `varchar`. Change it to `text`. |
| A saved PGN loads as one position | The text has no `[FEN "…"]` header, so it is treated as a plain FEN, or it has a header but no moves. |
| The move navigator is empty / ← → do nothing | The loaded puzzle is a plain FEN (one position), or no PGN is loaded. |
| ← → no longer switch puzzles | By design: ← → step moves, **↓** enters a variation, **↑** backs out, and **[ ]** switch puzzles. |
| New puzzles appear in the wrong place | New saves go to `highest position + 1`. To reorder, edit the CSV and run `python puzzles_csv.py --upload` (section 12). |
| Bulk add says "Row(s) … could not be read" | Each row needs two cells (the PGN, then the note) and the first must contain `[FEN "…"]`. A stray quote in the PGN that isn't doubled (`""`) breaks the row. Nothing was added. |
| `puzzles_csv.py` says to set `CHESS_SUPABASE_URL` | Export `CHESS_SUPABASE_URL` and `CHESS_SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`) in your shell. |
| Delete does nothing on an old row | It has no numeric `id`, or it was already deleted (`404 Puzzle not found`). |

---

## 10. Testing without touching real data

The API can be tested against a mocked `fetch` (no Supabase calls). Set the two env vars to dummy values, replace `globalThis.fetch`, call the handler with `{ method, query, body }`, and check the status and body. Send the `x-access-code` header on writes (set `ACCESS_CODE` to a dummy value too); a write without it must return `401` and make no Supabase request. For example, `DELETE` with `id=15;drop` must return `400`, an unknown id must return `404`, and a valid id must issue exactly one `DELETE …/rest/v1/puzzles?id=eq.15` request.

For the page, save a throwaway puzzle in a test category, load it, step with Prev/Next, then delete it.

---

## 11. Known limits

- The list endpoint returns every puzzle in a category at once. That is fine for hundreds, not for very large sets.
- The note is plain text. There are no images, tags or difficulty fields.
- The stored PGN keeps illegal moves as written, so some third-party PGN tools may not read them.
- Deleting does not renumber `position`; the next `python puzzles_csv.py --upload` does.

---

## 12. Backup and bulk edit with CSVs: `puzzles_csv.py`

Supabase is the source of truth. `puzzles_csv.py` (repo root) is a local script, not part of the web app. It turns the table into one CSV per category and back, so you can keep a backup or edit many puzzles in a text editor.

```
Supabase puzzles ──python puzzles_csv.py --download──▶  <category>.csv files
Supabase puzzles ◀──python puzzles_csv.py --upload────  (edited) <category>.csv files
```

- **Folder:** `~/Library/CloudStorage/Dropbox/study/chess` by default, the locally synced Dropbox folder. The script just reads and writes files there, so there is no Dropbox API and no sign-in. Use `--dir PATH` for another folder.
- **Files:** one per category, named `<category>.csv` (a `/` or `\` in a category name becomes `-`), header `fen,note`, rows in puzzle order. The `fen` cell can hold a whole PGN (quoted; commas, quotes and line breaks are fine, the script uses Python's `csv` module).
- **Keys:** `CHESS_SUPABASE_URL` and `CHESS_SUPABASE_SERVICE_ROLE_KEY` in the environment (it falls back to `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`). The script talks straight to Supabase with the service-role key; it does not use the access code.

Exactly one mode is required:

| Mode | What it does |
|---|---|
| `--download` | Writes `<category>.csv` for every category in Supabase, overwriting files whose content changed and skipping identical ones. CSVs for categories that no longer exist are left alone and listed. It never deletes files. |
| `--upload` | Reads every `*.csv` (category = file name) into Supabase. Rows with an empty `fen` are skipped and `position` is the row number in the file. Rows are matched by FEN (same category first, then any category), so a matched puzzle keeps its `id` and `?id=` links when you reorder, edit its note or move it to another CSV. Unmatched CSV rows are inserted; `category`, `note` and `position` are updated where they differ; **Supabase rows that match no CSV row are deleted.** Changing the FEN text itself makes a new puzzle with a new id and deletes the old one. It refuses to run if the CSVs contain no puzzles at all, so an empty or missing folder can't wipe the table. |

Options: `--dry-run` prints the plan (files to write, or `+add ~update -delete` with the rows that would be deleted) and changes nothing. `--yes` skips the confirmation; otherwise it always asks, and `--upload` lists the rows to be deleted before asking.

Typical use:

```bash
python puzzles_csv.py --download --dry-run   # what would be written
python puzzles_csv.py --download             # back up
# …edit the CSVs…
python puzzles_csv.py --upload --dry-run     # see +add ~update -delete first
python puzzles_csv.py --upload
```

**Take a `--download` first and read the `--upload --dry-run` plan.** An upload makes Supabase match the CSVs exactly, so anything added on the page since your last download (for example a bulk add) is deleted unless it is in the files. An upload straight after a download reports `+0 ~0 -0`.
