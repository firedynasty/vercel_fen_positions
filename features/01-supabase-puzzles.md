# 01. supabase-puzzles

**Verdict:** TBD -- keep / merge into ? / cut

## What it does

TBD -- one sentence, in user words.

## Entry point

`💾 Save to chess_puzzles_redone` at `index.html:629`

## Footprint

<!-- generated:buttons -->

**Buttons:** 7 (0 hidden, 0 proxy)

**Matching lines:** 195 in `index.html`

**Rule:** `\bsb[A-Z]\w*`

**localStorage keys on matching lines:** none

### Buttons

| line | id | label | handler |
|---:|---|---|---|
| 629 | `—` | 💾 Save to chess_puzzles_redone | `sbSavePuzzle` |
| 771 | `sbPrevPuzzleBtn` | ◀ Prev Puz | `sbPrevPuzzle` |
| 772 | `sbNextPuzzleBtn` | Next Puz ▶ | `sbNextPuzzle` |
| 803 | `—` | Load ID | `sbLoadPuzzleByIdInput` |
| 806 | `sbRevealNoteBtn` | 👁 Reveal Note | `sbToggleNote` |
| 810 | `sbCopyLinkBtn` | 🔗 Copy link | `sbCopyPuzzleLink` |
| 825 | `sbDeletePuzzleBtn` | 🗑️ Delete Loaded FEN/PGN | `sbDeletePuzzle` |

<!-- /generated:buttons -->

## Notes

TBD -- anything the generated block above cannot know:
couplings to other features, why it exists, what would break.
Everything outside the generated markers is yours; the script never
overwrites it.
