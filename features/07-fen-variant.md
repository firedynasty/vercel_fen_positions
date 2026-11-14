# 07. fen-variant

**Verdict:** TBD -- keep / merge into ? / cut

## What it does

TBD -- one sentence, in user words.

## Entry point

`📥 Load FEN to Board` at `fen.html:561`

## Footprint

<!-- generated:buttons -->

**Buttons:** 6 (0 hidden, 0 proxy)

**Matching lines:** 15 in `fen.html`

**Rule:** `showFenVariant|convertFenToVariant|syntaxConvertFenPositions|loadFenVariantOnBoard|copyTextAreaToClipboard`

**localStorage keys on matching lines:** none

### Buttons

| line | id | label | handler |
|---:|---|---|---|
| 561 | `—` | 📥 Load FEN to Board | `loadFenVariantOnBoard` |
| 674 | `showFenVariant` | Show FEN Variant (from board + clipboard) | `(inline fn) @1820` |
| 675 | `convertFenToVariant` | Convert FEN to Variant (+ clipboard) | `(inline fn) @1860` |
| 680 | `syntaxConvertFenPositions` | Syntax: Convert FEN Positions | `(inline fn) @1967` |
| 685 | `—` | Copy to Clipboard | `copyTextAreaToClipboard` |
| 686 | `—` | Load FEN Variant | `loadFenVariantOnBoard` |

<!-- /generated:buttons -->

## Notes

TBD -- anything the generated block above cannot know:
couplings to other features, why it exists, what would break.
Everything outside the generated markers is yours; the script never
overwrites it.
