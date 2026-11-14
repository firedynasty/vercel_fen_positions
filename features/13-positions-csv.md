# 13. positions-csv

**Verdict:** TBD -- keep / merge into ? / cut

## What it does

TBD -- one sentence, in user words.

## Entry point

`+ Add Position` at `index.html:920`

## Footprint

<!-- generated:buttons -->

**Buttons:** 6 (0 hidden, 1 proxy)

**Matching lines:** 13 in `index.html`

**Rule:** `csvFileInput|addPosition|deletePosition|downloadAsCSV|addRowFromClipboard|clearAllPositions`

**localStorage keys on matching lines:** none

### Buttons

| line | id | label | handler |
|---:|---|---|---|
| 912 | `—` | + Add Position | `addPosition` |
| 926 | `—` | ⬆ Load CSV/Excel | `proxy → #csvFileInput` |
| 927 | `—` | ⬇ Download as CSV | `downloadAsCSV` |
| 928 | `—` | 📋 Add from Clipboard | `addRowFromClipboard` |
| 929 | `—` | 🗑️ Clear All | `clearAllPositions` |
| 1710 | `—` | Delete | `stopPropagation, deletePosition` |

<!-- /generated:buttons -->

## Notes

TBD -- anything the generated block above cannot know:
couplings to other features, why it exists, what would break.
Everything outside the generated markers is yours; the script never
overwrites it.
