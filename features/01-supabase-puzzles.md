# 01. supabase-puzzles

**Verdict:** TBD -- keep / merge into ? / cut

## What it does

TBD -- one sentence, in user words.

## Entry point

`💾 Save to chess_puzzles_redone` at `index.html:629`

## Footprint

<!-- generated:buttons -->

**Buttons:** 5 (0 hidden, 0 proxy)

**Matching lines:** 185 in `index.html`

**Rule:** `\bsb[A-Z]\w*`

**localStorage keys on matching lines:** none

### Buttons

| line | id | label | handler |
|---:|---|---|---|
| 629 | `sbCatsBtn` | ▾ categories | `sbCatsToggle` |
| 630 | `—` | 💾 Save to chess_puzzles_redone | `sbSavePuzzle` |
| 776 | `sbPrevPuzzleBtn` | ◀ Prev Puz | `sbPrevPuzzle` |
| 777 | `sbNextPuzzleBtn` | Next Puz ▶ | `sbNextPuzzle` |
| 812 | `sbDeletePuzzleBtn` | 🗑️ Delete Loaded FEN/PGN | `sbDeletePuzzle` |

<!-- /generated:buttons -->

## Added

### `▾ categories` — the category list beside the save box (`index.html:629`)

`#sbNameInput` has always had a `<datalist>` (`#sbCategoryOptions`), but a datalist
only shows itself once you have typed the right first letters — no help when the
question is *"what did I call these last time?"*. The `▾ categories` button opens
`#sbCatsPanel` under the save row: every category in `chess_puzzles_redone`,
alphabetical, each with `×N` for how many puzzles already use it. Click one and the
box becomes `category: ` with the cursor on the note, same as accepting a datalist
suggestion. Typing in the box filters the list live, matched on the **category part
only** (`sbSplitName`), so `mate_in_5: win a pawn` still narrows to `mate_in_5`.

Mechanics (all at `index.html:3306-3433`):

- **No extra request.** `sbLoadAll` already fetched the rows; it now hands them to
  `sbCatsIndex(rows)`, which counts categories and relabels the button. Opening the
  panel calls `sbCatsLoad(true)` to go past `sbFlatCache` once, while it is on screen.
- **It says when it cannot read.** A failed fetch puts the reason in the panel
  (`Could not read chess_puzzles_redone (…) — type the category by hand`) instead of
  an empty list that reads as "no categories exist". An empty table says so too.
- Rows are built as DOM nodes, not an `innerHTML` string, so a category containing a
  quote cannot break the panel.
- `Escape` in the name box closes the panel; `Enter` still saves.

Ported from the `▾ names` panel in `react-chess-analysis_vercel` (`copyVarNamesBtn`),
with names → categories because this table's reusable half of `name` is the category.

**Trap #2:** `sbCatsBtnLabel()` reads `#sbCatsBtn` by id at `index.html:3339`. It is
guarded with `if (!btn) return;`, so deleting the button does not throw — but the
label logic goes with it.

## Notes

TBD -- anything the generated block above cannot know:
couplings to other features, why it exists, what would break.
Everything outside the generated markers is yours; the script never
overwrites it.
