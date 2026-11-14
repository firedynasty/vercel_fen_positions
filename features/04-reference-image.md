# 04. reference-image

**Verdict:** TBD -- keep / merge into ? / cut

## What it does

TBD -- one sentence, in user words.

## Entry point

`loadImageBtn` at `index.html:645`

## Footprint

<!-- generated:buttons -->

**Buttons:** 7 (0 hidden, 2 proxy)

**Matching lines:** 15 in `index.html`, 10 in `fen.html`

**Rule:** `imageFileInput|loadImageBtn|imageToFenBtn|readFenFromImage|closeImagePreview|toggleImageSize|closeBoardRefImage`

**localStorage keys on matching lines:** none

### Buttons

| line | id | label | handler |
|---:|---|---|---|
| 383 | `loadImageBtn` | 🖼️ Load Reference Image | `proxy → #imageFileInput` |
| 393 | `—` | Toggle Size | `toggleImageSize` |
| 394 | `—` | ✕ Close | `closeImagePreview` |
| 638 | `loadImageBtn` | 🖼️ Load Reference Image | `proxy → #imageFileInput` |
| 644 | `—` | × | `closeImagePreview` |
| 646 | `imageToFenBtn` | 🤖 Read FEN from image | `readFenFromImage` |
| 708 | `—` | × | `closeBoardRefImage` |

<!-- /generated:buttons -->

## Notes

TBD -- anything the generated block above cannot know:
couplings to other features, why it exists, what would break.
Everything outside the generated markers is yours; the script never
overwrites it.
