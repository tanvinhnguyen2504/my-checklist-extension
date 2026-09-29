# Plan: Restructure the Extension into a `src/` Layout Organised by Layer

## Goal

The repo root is currently both the extension root *and* a flat bag of ten JS
modules, a stylesheet, two HTML pages, four markdown docs, and a manifest. The
module graph underneath is already cleanly layered — `utils.js` is pure and
worker-safe, `menu.js` and `drag-drop.js` are generic UI mechanics, four files
are self-contained features, and three are entry points — but nothing in the
folder says so. This plan moves every source file into a `src/` tree that mirrors
that existing graph, removes a stale doc, and repairs the two documents that
publish a file table. It is a **path-rewrite-only** change to the source: no
function is renamed, no module boundary moves, no behaviour changes.

This supersedes `docs/plans/20260927-2105-restructure-src-by-layer/`, whose
Phase 1 has been overtaken by events (see Architecture decisions).

## Scope

**In scope**

- Creating `src/core/`, `src/ui/`, `src/features/` and moving all ten JS modules
  plus `popup.css` into `src/`, using `git mv` so history follows each file.
- Rewriting the 15 relative `import` specifiers across seven files.
- Updating `manifest.json`'s `background.service_worker` path.
- Updating the `<link>` and `<script>` tags in `popup.html` and `reminder.html`.
- Deleting the stale `icons/INSTALL.md`, so `icons/` holds only PNGs.
- Repairing the file tables in `CLAUDE.md` and `README.md` — new paths **and**
  the modules both tables currently omit.
- Updating the one place `CLAUDE.md` hardcodes a source path inside a code
  sample the reader is told to run.
- Getting to a clean tree on a feature branch, as a precondition.

**Out of scope**

- Renaming any file. `popup.css` keeps its name even though `reminder.html` also
  loads it — a rename is a separate, arguable change (see Open questions).
- Moving `popup.html` / `reminder.html` off the root. Keeping the two pages at
  the extension root keeps `background.js`'s `url: "reminder.html"` and the
  manifest's `default_popup` untouched, and those are the two path strings most
  likely to fail silently.
- Introducing a build step, a bundler, a `package.json`, or a test framework.
- Splitting, merging, or reorganising the *contents* of any module.
- The pre-existing dead code already catalogued in `CLAUDE.md` — `debounce()`,
  `formatDate()`, the broken `.priority-label` CSS block, the unwired `.flag`
  button. A file move is not the commit to clean those up in.
- The `reminder.js` defects noted during the stash split: the `if (!state ||
  !state.items)` guard sitting *after* `state.theme` is dereferenced, and the
  missing semicolons. Real, but behavioural — not this plan's commit.
- Rewriting `CHANGELOG.md` beyond committing what is already in the tree.

## Architecture / Design decisions

**The folder mirrors the import graph, not the page graph.** The alternative —
`src/popup/`, `src/reminder/`, `src/background/`, `src/shared/` — was considered
and rejected. Two files make it false: `popup.css` is loaded by *both* HTML
pages, and `utils.js` is imported by the service worker as well as both pages.
Under a per-page layout, more than half the source would land in `shared/`,
which is a flat folder with an extra level of nesting. Layering by role puts the
dependency direction into the path itself: `core` ← `ui` ← `features` ← entry
points, and nothing ever imports upward.

**Three layers, not two.** `src/ui/` holds only `menu.js` and `drag-drop.js`,
which is thin. It stays a separate folder because the distinction it encodes is
real and checkable: both files import nothing, and `features/` imports them.
Folding them into `features/` would put a module that depends on nothing beside
four that depend on three things each.

**Phase 1 of the superseded plan is done, but its goal is not.** Its task list —
commit the four dirty JS files and the plan-4 doc — landed as commits `8f2749c`,
`e54feb9`, `1c4b16b`, `59ad78d`. Two things it assumed are nonetheless false
today: those commits went onto `main` rather than a branch, and the tree is dirty
again for new reasons (`CHANGELOG.md`, this plan folder, and a non-empty stash
that its own verify step forbids). Phase 1 here is therefore a *different* phase
with the same purpose, not a re-run.

**`manifest.json` cannot move; the HTML pages could but should not.** Chrome
resolves `manifest.json` from the folder you select in `chrome://extensions`, so
it is pinned to the root by definition. The HTML pages are only *referenced* by
root-relative strings (`default_popup: "popup.html"` in the manifest, `url:
"reminder.html"` in `background.js`), so they could move. They stay because
moving them buys one tidier root listing at the cost of touching the two
string-typed, unchecked paths in the codebase — the exact class of reference that
fails at runtime with no error at edit time.

**Import specifiers are relative, so depth is the thing that changes.** Files
landing at `src/` top level keep a one-level reach (`./core/utils.js`); files
landing one level deeper reach back up (`../core/utils.js`). This is the only
mechanical risk in the whole restructure, and it is why Phase 2 ends with a grep
asserting no bare `./utils.js`-style specifier survives.

**A service worker in a subdirectory is fine here.** `background.service_worker`
accepts a path, and the classic caveat — a worker's *scope* being limited to its
own directory — applies to page control, which an extension worker never does.
Called out in Phase 2 because it looks like a problem during review.

**Every phase leaves the extension loadable.** No phase is a half-move. Phase 2
moves JS and fixes every JS-facing reference in the same commit; Phase 3 does the
same for CSS. Reloading in `chrome://extensions` is a valid verification step at
the end of each one, which it would not be if the moves and the rewrites were
split apart.

**The doc tables are incomplete, not merely wrong.** `README.md`'s table omits
`menu.js`, `priority.js`, `due-date.js`, `export.js` and `drag-drop.js`;
`CLAUDE.md`'s Layout table omits the first four. Treating Phase 5 as a
path-rewrite would preserve both gaps at new paths. It is a repair, not a
substitution — and it is the phase where a reader first learns the layer names,
so the table has to show them.

## Phases

| Phase | File | What it delivers |
|-------|------|-----------------|
| 1 | `plan-1-clean-tree-on-a-branch.md` | A feature branch with an empty `git status` and an empty stash list, so the moves render as renames |
| 2 | `plan-2-move-js-into-src-by-layer.md` | All ten JS modules under `src/core`, `src/ui`, `src/features` and `src/`, with every import, the manifest, and both `<script>` tags rewritten |
| 3 | `plan-3-move-stylesheet-into-src.md` | `popup.css` at `src/popup.css`, both `<link>` tags rewritten |
| 4 | `plan-4-delete-stale-install-doc.md` | `icons/` holding only PNGs, with the stale `INSTALL.md` gone rather than relocated |
| 5 | `plan-5-repair-docs-file-tables.md` | `CLAUDE.md` and `README.md` describing the layout that now exists, with all ten modules listed |

Four commits, one per phase 2–5; Phase 1 contributes its own preparatory commits.

## Success criteria

- Work happens on a feature branch, not `main`, and `git status --short` is empty
  and `git stash list` is empty at the start of Phase 2.
- Every move commit shows its files as `R` (rename) in `git log --stat -M`, not
  as paired add/delete.
- The final tree is exactly: `manifest.json`, `popup.html`, `reminder.html`,
  `README.md`, `CHANGELOG.md`, `CLAUDE.md`, `.gitignore` at root; `src/popup.css`,
  `src/popup.js`, `src/reminder.js`, `src/background.js`, `src/core/utils.js`,
  `src/ui/{menu,drag-drop}.js`,
  `src/features/{priority,due-date,settings,export}.js`; `icons/` containing four
  `.png` files and nothing else; `docs/plans/` and no `docs/INSTALL.md`.
- `ls *.js *.css` returns nothing.
- No surviving specifier names a file at a path where it no longer sits — the
  Phase 2 grep returns nothing.
- `node --input-type=module -e 'import("./src/core/utils.js").then(m => console.log(Object.keys(m).length))'`
  runs with no `window` stub and prints a count, proving the service worker's
  import path still resolves and `utils.js` is still worker-safe.
- Loading the repo root unpacked in `chrome://extensions` produces no manifest
  error and no red **Errors** badge, and the `service worker` link shows a worker
  that started.
- Opening the toolbar popup renders the list, the theme and width switches
  respond, adding an item persists across a close/reopen, the priority menu opens
  from the `.tag` button, drag-to-reorder completes, and the CSV button downloads
  a file — i.e. every module that was moved is exercised at least once.
- With the daily reminder enabled at a time one minute out, the reminder window
  opens, **is styled** (proving `src/popup.css` resolves from `reminder.html`),
  and ticking an item there is reflected in the popup.
- Every path in `CLAUDE.md`'s Layout table and `README.md`'s file table resolves
  under `ls`, and each table lists all ten JS modules.
- The jsdom snippet in `CLAUDE.md` names a `<script>` tag string that actually
  occurs in `popup.html`.

## Open questions

1. **Should `popup.css` be renamed on the way in?** It is loaded by both pages,
   so `src/popup.css` still mis-describes itself — `src/styles.css` would be
   honest. Left as-is because a rename plus a move in one commit is harder to
   review than either alone, and `CLAUDE.md` already documents the sharing. Say
   the word and it becomes a one-line addition to Phase 3.
2. **Should `docs/` also absorb `CHANGELOG.md`?** Kept at the root because a root
   `CHANGELOG.md` is what tooling and readers expect, and `README.md` links to
   it.
3. **Does anything outside this repo reference these paths?** A published
   extension listing, a CI workflow, or a packaging script pointed at `popup.js`
   would break. Nothing in the repo does, and there is no `.github/` directory,
   but only you know what exists outside it.
4. **Does the superseded plan folder stay?** `docs/plans/20260927-2105-…`
   describes the same work with an obsolete Phase 1. Kept, on the grounds that
   plan folders are a dated record rather than live documentation. Delete it if
   you would rather `docs/plans/` held only plans that were followed.
