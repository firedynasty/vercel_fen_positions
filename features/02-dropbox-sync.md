# 02. dropbox-sync

**Verdict:** TBD -- keep / merge into ? / cut

## What it does

TBD -- one sentence, in user words.

## Entry point

`dbLoginBtn` at `index.html:927`

## Footprint

<!-- generated:buttons -->

**Buttons:** 7 (2 hidden, 0 proxy)

**Matching lines:** 150 in `index.html`

**Rule:** `\bdb[A-Z]\w*|dropbox|Dropbox`

**localStorage keys on matching lines:** none

### Buttons

| line | id | label | handler |
|---:|---|---|---|
| 919 | `dbLoginBtn` | DB Login | `dropboxSignIn` |
| 920 | `dbFilesBtn` | DB Files **(hidden)** | `openDropboxSidebar` |
| 921 | `dbLogoutBtn` | DB Logout **(hidden)** | `dropboxSignOut` |
| 1021 | `closeDropboxSidebar` | × | `closeDropboxSidebar` |
| 1025 | `dropboxSearchBtn` | Search | `dropboxSearch, getElementById` |
| 1031 | `dropboxSaveConfirmBtn` | Save | `dropboxConfirmSave` |
| 1035 | `dropboxBackBtn` | ← Back | `dropboxGoBack` |

<!-- /generated:buttons -->

## Notes

TBD -- anything the generated block above cannot know:
couplings to other features, why it exists, what would break.
Everything outside the generated markers is yours; the script never
overwrites it.
