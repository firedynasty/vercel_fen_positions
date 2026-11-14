# 05. dictate-moves

**Verdict:** TBD -- keep / merge into ? / cut

## What it does

TBD -- one sentence, in user words.

## Entry point

`♟ Clean Board` at `index.html:687`

## Footprint

<!-- generated:buttons -->

**Buttons:** 5 (0 hidden, 0 proxy)

**Matching lines:** 56 in `index.html`

**Rule:** `\bdictate[A-Z]\w*|undoDictatedMove`

**localStorage keys on matching lines:** none

### Buttons

| line | id | label | handler |
|---:|---|---|---|
| 684 | `—` | ♟ Clean Board | `dictateCleanBoard` |
| 685 | `—` | ↩ Undo | `undoDictatedMove` |
| 697 | `—` | Go to move | `dictateGoToMove` |
| 698 | `—` | Load PGN from input | `dictateLoadPgn` |
| 702 | `—` | += Apply Moves | `dictateApplyMoves` |

<!-- /generated:buttons -->

## Notes

TBD -- anything the generated block above cannot know:
couplings to other features, why it exists, what would break.
Everything outside the generated markers is yours; the script never
overwrites it.
