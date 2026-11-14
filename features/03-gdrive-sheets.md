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
| 938 | `gdrive-auth-btn` | Sign In | `gdriveSignIn` |
| 976 | `—` | Save Puzzle | `gdriveSavePuzzle` |
| 977 | `—` | Replace Row | `gdriveReplaceRow` |
| 978 | `—` | Clear Inputs | `gdriveClearInputs` |
| 987 | `—` | × | `getElementById, remove` |
| 990 | `—` | - | `gdriveCommentFontSize` |
| 992 | `—` | + | `gdriveCommentFontSize` |
| 1030 | `—` | ✕ | `closeSheetPicker` |

<!-- /generated:buttons -->

## Notes

TBD -- anything the generated block above cannot know:
couplings to other features, why it exists, what would break.
Everything outside the generated markers is yours; the script never
overwrites it.
