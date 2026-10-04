# How the Supabase puzzle feature works

Save the position (or whole PGN) on the board to a Supabase table, group it into categories, and load, step through, and delete it later.

Everything here is described from the code as it runs today: `api/puzzles.js` (server) and the `sb…` functions plus the "Supabase Puzzles" section in `index.html` (browser).

> **Source of truth: Dropbox, not Supabase.** The puzzles are kept as CSVs in Dropbox, one file per category: `/study/chess/<category>.csv` with columns `fen,note`, rows in puzzle order. Supabase is the copy this page reads, so `?id=` links and Load by ID work without a Dropbox sign-in. See section 12.

---

## 1. Big picture

```
browser (index.html)                 Vercel function                  Supabase
┌───────────────────────┐   fetch   ┌──────────────────┐   REST     ┌──────────────┐
│ Supabase Puzzles panel│ ────────▶ │ /api/puzzles     │ ─────────▶ │ table        │
│  sbSavePuzzle()       │           │ (api/puzzles.js) │  service   │ `puzzles`    │
│  sbLoadPuzzles…()     │ ◀──────── │ holds the secret │  role key  │              │
│  sbDeletePuzzle()     │   JSON    │ key server-side  │ ◀───────── │              │
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

For local work run `vercel dev` (a plain static server, like `npm run dev`, has no `/api`). If either variable is missing, every call returns `500 {"error":"Supabase env vars not set on server."}`.

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
- A new save gets `position = (highest position in that category) + 1` (1 if the category is empty), so new puzzles go to the end.
- Deleting a puzzle leaves a gap in the numbers. That is fine, the sort order still works.
- To reorder, move lines in the category's CSV in Dropbox and press **⇅ Sync from Dropbox**: `position` becomes each row's line number (see section 12).

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

CORS is open (`Access-Control-Allow-Origin: *`) and allows `GET, POST, DELETE, OPTIONS`.

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

### `POST /api/puzzles`
Saves a puzzle. Body:
```json
{ "action": "save", "category": "endgames", "note": "win a pawn", "fen": "<FEN or PGN text>" }
```
- `category` and `fen` are required (`400` if missing). `note` is optional.
- The function looks up the category's highest `position` first and stores `position = highest + 1`.
- Response: `200 { "success": true, "puzzle": { …the new row… } }`.

### `DELETE /api/puzzles?id=13`
Deletes one puzzle.
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
| **◀ Prev / Next ▶** | Move to the previous or next puzzle in the category and load it. They wrap around at both ends. Disabled until a category has loaded. |
| **Prev 🔄 / 🔄 Cycle Board** | Step back or forward through the positions of a **loaded PGN**. For a plain-FEN puzzle there is only one position, so they show "No positions to cycle". |
| **👁 Reveal Note** | Shows or hides the puzzle's note. The note hides again whenever you load another puzzle. |

**What loading does**
- **Plain FEN:** the FEN goes into the FEN box and loads on the board, like Load on Board.
- **PGN:** the PGN is read into the list of positions (start, then one per move), the first position is shown, and Prev 🔄 / Cycle Board step through the rest. The PGN text area is filled too, so dropping more pieces appends moves to it.

### Save / delete row

| Control | What it does |
|---|---|
| **Category dropdown** (save) | Pick an existing category or **+ New category…**. |
| **New category name box** | Appears only for **+ New category…**. |
| **Note box** | Optional hint text stored in `note`. |
| **💾 Save Board FEN to Supabase** | Saves either the board's FEN or the whole PGN (rule below). |
| **🗑️ Delete Loaded FEN/PGN** | Deletes the puzzle selected in the puzzle dropdown, after a confirm dialog. |

A status line under the row shows "Saving…", "Saved FEN to …", "Saved PGN to …" or "Deleted …".

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
  └─ POST /api/puzzles { action:"save", category, note, fen }
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
  → plain FEN → load on board;  PGN → load into the cycle list
```

### Delete

```
click 🗑️ (a puzzle must be selected)
  → confirm("Delete this FEN/PGN puzzle from <category>? This cannot be undone.")
  → DELETE /api/puzzles?id=<id>
  → reload categories, stay in the same category (unless it is now empty),
    reload the puzzle dropdown; the first remaining puzzle loads
```

Cancel in the dialog does nothing. There is no undo.

---

## 7. Where the code lives

**`api/puzzles.js`**: the whole server side (`categories`, `list`, `get`, `save`, `delete`).

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
| `sbDeletePuzzle()` | Confirm and delete. |

Related PGN pieces the feature depends on: `pgnAdoptFromText`, `replayPgnRelaxed`, `parseFenVariantToPositions`, `cycleBoard`, `cycleBoardPrev`, and the `cyclePositions` / `cyclePgnSource` variables.

---

## 8. Security notes

- The service-role key is only ever on the server. Keep `SUPABASE_SERVICE_ROLE_KEY` out of the repo and out of any client code.
- The endpoint has **no login**. Anyone who can reach `/api/puzzles` can list, save and **delete** puzzles. If the site is public, add a shared-secret check to the `POST` and `DELETE` branches (compare a request header to a secret env var, reject with `401`).
- `category` is passed into the Supabase query as `eq.<category>` by URL-encoding, and delete only takes digits. Do not build other query strings from raw user text without doing the same.
- Deletes are permanent. If you want an undo, switch to a soft delete (a `deleted_at` column that the list query filters out).

---

## 9. Troubleshooting

| Symptom | Likely cause |
|---|---|
| `500 Supabase env vars not set on server.` | `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing. Set it in Vercel (and redeploy) or in your `vercel dev` environment. |
| Categories load but the puzzle dropdown says "Failed to load" | The `position` column probably does not exist (the list request asks for it). Run the `alter table` from section 2. |
| Category dropdown says "Failed to load" | The `/api` route is not running (static server instead of `vercel dev`), or the env vars are wrong. Check the browser console and the network tab. |
| Saving a PGN fails with a length error | `fen` is a short `varchar`. Change it to `text`. |
| A saved PGN loads as one position | The text has no `[FEN "…"]` header, so it is treated as a plain FEN, or it has a header but no moves. |
| Prev 🔄 / Cycle Board say "No positions to cycle" | The loaded puzzle is a plain FEN, or no PGN is loaded. |
| New puzzles appear in the wrong place | New saves go to `highest position + 1`. Run **⇅ Sync from Dropbox** to make the order match the CSV. |
| Delete does nothing on an old row | It has no numeric `id`, or it was already deleted (`404 Puzzle not found`). |

---

## 10. Testing without touching real data

The API can be tested against a mocked `fetch` (no Supabase calls). Set the two env vars to dummy values, replace `globalThis.fetch`, call the handler with `{ method, query, body }`, and check the status and body. For example, `DELETE` with `id=15;drop` must return `400`, an unknown id must return `404`, and a valid id must issue exactly one `DELETE …/rest/v1/puzzles?id=eq.15` request.

For the page, save a throwaway puzzle in a test category, load it, step with Prev/Next, then delete it.

---

## 11. Known limits

- The list endpoint returns every puzzle in a category at once. That is fine for hundreds, not for very large sets.
- The note is plain text. There are no images, tags or difficulty fields.
- The stored PGN keeps illegal moves as written, so some third-party PGN tools may not read them.
- Deleting does not renumber `position` until the next sync.

---

## 12. Dropbox CSVs (source of truth) and Sync

```
Dropbox /study/chess/<category>.csv  ──⇅ Sync from Dropbox──▶  Supabase puzzles  ──▶  this page
        ▲  Save appends a row, Delete removes it (and both also update Supabase)
```

- **One CSV per category**, file name = category: `/study/chess/mate_in_5.csv`. Columns `fen,note`; the `fen` cell can hold a whole PGN (quoted, line breaks are fine).
- **Save** (needs Dropbox sign-in; the page signs in and finishes the save on return) appends a row to the category's CSV (creating it with a `fen,note` header if new), then saves to Supabase.
- **Delete** removes the row from the CSV, then from Supabase.
- **Writes are safe**: each write only goes through if the CSV hasn't changed in Dropbox since the page read it; otherwise it says "changed in Dropbox… try again".
- **⇅ Sync from Dropbox** reads every CSV in `/study/chess` and makes Supabase match. It shows a summary (+add, ~update, −delete, and which puzzles would be deleted) and asks before changing anything. Rows are matched by FEN, so a puzzle keeps its `id` (and `?id=` links) when you reorder lines, edit its note, or move it to another CSV. Changing the FEN text itself makes it a new puzzle with a new id. A sync that finds no puzzles at all is refused, so an empty or missing folder can't wipe the table.
- **Export to Dropbox (once)** writes the current Supabase puzzles out as CSVs, for the first switch-over. Existing CSVs are never overwritten.
- The Dropbox sign-in lasts for the browser tab (stored in `sessionStorage`).
