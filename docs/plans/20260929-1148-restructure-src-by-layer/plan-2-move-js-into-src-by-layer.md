# Phase 2 — Move Every JS Module into `src/`, Layered

## Goal

Relocate all ten JavaScript files into `src/core`, `src/ui`, `src/features` and
`src/`, and fix every reference to them — 15 import specifiers, one manifest
field, two `<script>` tags — in the same commit.

## Tasks

- [ ] `mkdir -p src/core src/ui src/features`
- [ ] `git mv` each file to its new home:
      - `utils.js` → `src/core/utils.js`
      - `menu.js` → `src/ui/menu.js`
      - `drag-drop.js` → `src/ui/drag-drop.js`
      - `priority.js` → `src/features/priority.js`
      - `due-date.js` → `src/features/due-date.js`
      - `settings.js` → `src/features/settings.js`
      - `export.js` → `src/features/export.js`
      - `popup.js` → `src/popup.js`
      - `reminder.js` → `src/reminder.js`
      - `background.js` → `src/background.js`
- [ ] Rewrite the import specifiers per the table below.
- [ ] `manifest.json`: `background.service_worker` becomes `"src/background.js"`.
- [ ] `popup.html:74`: `<script type="module" src="popup.js">` becomes
      `src="src/popup.js"`.
- [ ] `reminder.html:22`: `<script type="module" src="reminder.js">` becomes
      `src="src/reminder.js"`.
- [ ] Leave `background.js:46`'s `url: "reminder.html"` alone — it is resolved
      against the extension root, and `reminder.html` has not moved.
- [ ] Leave `manifest.json`'s `default_popup` and both `icons` blocks alone.
- [ ] Commit as a single rename-plus-rewrite commit.

## Implementation notes

**The complete specifier rewrite.** Fifteen edits across seven files; the other
three files (`src/ui/menu.js`, `src/ui/drag-drop.js`, `src/core/utils.js`) import
nothing and need no edit at all.

| File (new path) | Old specifier | New specifier |
|---|---|---|
| `src/popup.js` | `./utils.js` | `./core/utils.js` |
| `src/popup.js` | `./drag-drop.js` | `./ui/drag-drop.js` |
| `src/popup.js` | `./menu.js` | `./ui/menu.js` |
| `src/popup.js` | `./settings.js` | `./features/settings.js` |
| `src/popup.js` | `./priority.js` | `./features/priority.js` |
| `src/popup.js` | `./due-date.js` | `./features/due-date.js` |
| `src/popup.js` | `./export.js` | `./features/export.js` |
| `src/reminder.js` | `./utils.js` | `./core/utils.js` |
| `src/background.js` | `./utils.js` | `./core/utils.js` |
| `src/features/settings.js` | `./utils.js` | `../core/utils.js` |
| `src/features/priority.js` | `./utils.js` | `../core/utils.js` |
| `src/features/priority.js` | `./menu.js` | `../ui/menu.js` |
| `src/features/due-date.js` | `./utils.js` | `../core/utils.js` |
| `src/features/due-date.js` | `./menu.js` | `../ui/menu.js` |
| `src/features/export.js` | `./utils.js` | `../core/utils.js` |

Two of these are multi-line import statements, so the specifier is not on the
same line as the `import` keyword: `src/popup.js` closes its `utils.js` import at
line 19 (`} from "./utils.js";`) and `src/reminder.js` at line 9. A
line-oriented edit keyed on `^import` would miss both.

**Do the rewrite by hand or with a reviewed `sed`, not a blind global.** A
project-wide `s|\./utils\.js|./core/utils.js|` would also hit
`src/features/*`, where the correct answer is `../core/utils.js`. Run the
entry-point rewrite and the feature-folder rewrite as two separate passes over
two separate file sets.

**Comments mention filenames too.** `src/popup.js:250` and `src/ui/menu.js:33`
both reference `popup.css` in prose. Those are not import specifiers — leave them
for Phase 3, where the stylesheet actually moves.

**A service worker in a subdirectory is supported.** `background.service_worker`
takes a path, and the usual "a worker only controls its own directory" caveat is
about page scope, which an extension service worker never exercises. If Chrome
does reject it, the fallback is a one-line root `background.js` that does nothing
but `import "./src/background.js"` — but expect not to need it.

**The manifest is the one file that cannot move.** Chrome resolves everything in
it relative to the folder you select in `chrome://extensions`, which is the repo
root.

**No content changes.** Nothing in this phase renames a function, reorders an
import block, or reformats a file. If the diff shows anything beyond a path
string, back it out. In particular, do not fix the `reminder.js` guard-order bug
or the missing semicolons here — they are listed out of scope in `plan.md`.

## Verify

- `git log --stat -M -1` shows ten files as renames (`R100` for the seven with no
  import edits, lower similarity for the three rewritten), plus modifications to
  `manifest.json`, `popup.html` and `reminder.html`.
- `ls *.js` returns nothing.
- This grep returns nothing:
  ```
  grep -rn 'from "\./utils\.js"\|from "\./menu\.js"\|from "\./drag-drop\.js"\|from "\./priority\.js"\|from "\./due-date\.js"\|from "\./settings\.js"\|from "\./export\.js"' src/
  ```
- `grep -c 'from "\.' src/**/*.js src/*.js` totals 15 specifiers, same as before
  the move.
- `node --input-type=module -e 'import("./src/core/utils.js").then(m => console.log(Object.keys(m).length))'`
  prints a number with no `window` stub — the service worker's path and
  DOM-freeness both still hold.
- Reload unpacked in `chrome://extensions`: no manifest error, no **Errors**
  badge, and the `service worker` link shows an active worker.
- Open the popup and exercise one thing per moved module: add an item
  (`popup.js`, `core/utils.js`), open the priority menu from `.tag`
  (`features/priority.js`, `ui/menu.js`), click the due chip
  (`features/due-date.js`), drag a row to reorder (`ui/drag-drop.js`), open
  settings and flip a switch (`features/settings.js`), click the CSV button
  (`features/export.js`).
- Enable the reminder one minute out and confirm the window opens
  (`src/background.js`, `src/reminder.js`). It will be unstyled until Phase 3
  only if you also moved the CSS early — it should still be styled here.
