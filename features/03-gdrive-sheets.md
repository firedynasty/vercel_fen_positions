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
| 894 | `gdrive-auth-btn` | Sign In | `gdriveSignIn` |
| 932 | `—` | Save Puzzle | `gdriveSavePuzzle` |
| 933 | `—` | Replace Row | `gdriveReplaceRow` |
| 934 | `—` | Clear Inputs | `gdriveClearInputs` |
| 943 | `—` | × | `getElementById, remove` |
| 946 | `—` | - | `gdriveCommentFontSize` |
| 948 | `—` | + | `gdriveCommentFontSize` |
| 986 | `—` | ✕ | `closeSheetPicker` |

<!-- /generated:buttons -->

## Notes

TBD -- anything the generated block above cannot know:
couplings to other features, why it exists, what would break.
Everything outside the generated markers is yours; the script never
overwrites it.
