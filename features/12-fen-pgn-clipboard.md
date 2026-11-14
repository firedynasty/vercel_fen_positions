# 12. fen-pgn-clipboard

**Verdict:** TBD -- keep / merge into ? / cut

## What it does

TBD -- one sentence, in user words.

## Entry point

`pasteFenBtn` at `index.html:668`

## Footprint

<!-- generated:buttons -->

**Buttons:** 7 (0 hidden, 0 proxy)

**Matching lines:** 14 in `index.html`, 2 in `fen.html`

**Rule:** `pasteFenFromClipboard|pastePgnFromClipboard|pasteFenBtn|pastePgnBtn|clearPgn|clearMovesKeepFen|copyPgnOneLine|Copy PGN|1-Line|redoFenInput`

**localStorage keys on matching lines:** none

### Buttons

| line | id | label | handler |
|---:|---|---|---|
| 520 | `—` | ✏️ Redo Input (Edit FEN) | `redoFenInput` |
| 660 | `pasteFenBtn` | 📋 Paste FEN | `pasteFenFromClipboard` |
| 661 | `pastePgnBtn` | 📋 Paste PGN | `pastePgnFromClipboard` |
| 669 | `—` | 📋 Copy PGN | `writeText, getElementById, trim, then` |
| 670 | `—` | 🗑️ Clear PGN | `clearPgn` |
| 671 | `—` | ↺ Clear moves, keep FEN | `clearMovesKeepFen` |
| 673 | `—` | 1-Line | `copyPgnOneLine` |

<!-- /generated:buttons -->

## Notes

TBD -- anything the generated block above cannot know:
couplings to other features, why it exists, what would break.
Everything outside the generated markers is yours; the script never
overwrites it.
