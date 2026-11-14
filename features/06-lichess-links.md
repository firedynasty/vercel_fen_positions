# 06. lichess-links

**Verdict:** TBD -- keep / merge into ? / cut

## What it does

TBD -- one sentence, in user words.

## Entry point

`lichessLinksBtn` at `index.html:662`

## Footprint

<!-- generated:buttons -->

**Buttons:** 10 (0 hidden, 0 proxy)

**Matching lines:** 14 in `index.html`, 3 in `fen.html`

**Rule:** `copyLichessUrl|copyLichessModalUrl|lichessLinksModal|lichessLinksBtn|pasteLichessUrlFromClipboard|pasteLichessUrlBtn`

**localStorage keys on matching lines:** none

### Buttons

| line | id | label | handler |
|---:|---|---|---|
| 509 | `—` | Copy White to Move URL | `copyLichessUrl` |
| 516 | `—` | Copy Black to Move URL | `copyLichessUrl` |
| 662 | `lichessLinksBtn` | Lichess Links | `openLichessLinksModal` |
| 663 | `pasteLichessUrlBtn` | 🔗 Paste Lichess URL | `pasteLichessUrlFromClipboard` |
| 781 | `—` | Copy White to Move URL | `copyLichessUrl` |
| 788 | `—` | Copy Black to Move URL | `copyLichessUrl` |
| 946 | `—` | ✕ | `getElementById` |
| 953 | `—` | Copy White Analysis URL | `copyLichessModalUrl` |
| 959 | `—` | Copy Black Analysis URL | `copyLichessModalUrl` |
| 965 | `—` | Copy Editor URL | `copyLichessModalUrl` |

<!-- /generated:buttons -->

## Notes

TBD -- anything the generated block above cannot know:
couplings to other features, why it exists, what would break.
Everything outside the generated markers is yours; the script never
overwrites it.
