# 11. board-preview

**Verdict:** TBD -- keep / merge into ? / cut

## What it does

TBD -- one sentence, in user words.

## Entry point

`&#127937; Load on Board` at `index.html:666`

## Footprint

<!-- generated:buttons -->

**Buttons:** 13 (0 hidden, 0 proxy)

**Matching lines:** 29 in `fen.html`, 14 in `index.html`

**Rule:** `loadFenOnBoard|grabFenFromBoard|clearFenDisplay|showChessBoard|hideChessBoard|flipBoard|resetBoard|setKingVsKing|readBoardPosition`

**localStorage keys on matching lines:** none

### Buttons

| line | id | label | handler |
|---:|---|---|---|
| 403 | `—` | ↻ Refresh | `showChessBoard` |
| 404 | `—` | ✕ Hide Board | `hideChessBoard` |
| 438 | `—` | 👁️ Show Board | `showChessBoard` |
| 439 | `—` | 🏁 Load on Board | `loadFenOnBoard` |
| 540 | `—` | 🏁 Load (for Links) | `loadFenOnBoard` |
| 541 | `—` | 🔊 Read Board Position | `readBoardPosition` |
| 562 | `—` | 🔄 Flip Board | `flipBoard` |
| 563 | `—` | ♟️ Reset Board | `resetBoard` |
| 564 | `—` | King vs King | `setKingVsKing` |
| 658 | `—` | 🏁 Load on Board | `loadFenOnBoard` |
| 659 | `—` | 🗑️ Clear FEN | `clearFenDisplay` |
| 672 | `—` | 📥 Grab FEN from board | `grabFenFromBoard` |
| 826 | `—` | ↻ Flip Board | `flipBoard` |

<!-- /generated:buttons -->

## Notes

TBD -- anything the generated block above cannot know:
couplings to other features, why it exists, what would break.
Everything outside the generated markers is yours; the script never
overwrites it.
