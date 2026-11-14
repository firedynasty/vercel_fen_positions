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
| 943 | `gdrive-auth-btn` | Sign In | `gdriveSignIn` |
| 981 | `—` | Save Puzzle | `gdriveSavePuzzle` |
| 982 | `—` | Replace Row | `gdriveReplaceRow` |
| 983 | `—` | Clear Inputs | `gdriveClearInputs` |
| 992 | `—` | × | `getElementById, remove` |
| 995 | `—` | - | `gdriveCommentFontSize` |
| 997 | `—` | + | `gdriveCommentFontSize` |
| 1035 | `—` | ✕ | `closeSheetPicker` |

<!-- /generated:buttons -->

## Notes

TBD -- anything the generated block above cannot know:
couplings to other features, why it exists, what would break.
Everything outside the generated markers is yours; the script never
overwrites it.
