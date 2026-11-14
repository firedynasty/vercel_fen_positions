# 03. gdrive-sheets

**Verdict:** TBD -- keep / merge into ? / cut

## What it does

TBD -- one sentence, in user words.

## Entry point

`gdrive-auth-btn` at `index.html:964`

## Footprint

<!-- generated:buttons -->

**Buttons:** 8 (0 hidden, 0 proxy)

**Matching lines:** 199 in `index.html`

**Rule:** `gdrive|closeSheetPicker|sheetPicker`

**localStorage keys on matching lines:** none

### Buttons

| line | id | label | handler |
|---:|---|---|---|
| 956 | `gdrive-auth-btn` | Sign In | `gdriveSignIn` |
| 994 | `—` | Save Puzzle | `gdriveSavePuzzle` |
| 995 | `—` | Replace Row | `gdriveReplaceRow` |
| 996 | `—` | Clear Inputs | `gdriveClearInputs` |
| 1005 | `—` | × | `getElementById, remove` |
| 1008 | `—` | - | `gdriveCommentFontSize` |
| 1010 | `—` | + | `gdriveCommentFontSize` |
| 1048 | `—` | ✕ | `closeSheetPicker` |

<!-- /generated:buttons -->

## Notes

TBD -- anything the generated block above cannot know:
couplings to other features, why it exists, what would break.
Everything outside the generated markers is yours; the script never
overwrites it.
