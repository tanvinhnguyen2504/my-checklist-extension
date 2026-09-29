# Phase 5 — Repair the File Tables in `CLAUDE.md` and `README.md`

## Goal

Make the two documents that publish a layout table describe the layout that now
exists — correct paths, and every module present.

## Tasks

- [ ] `CLAUDE.md` — rewrite the **Layout** table (lines ~10–20). Update the `File`
      column to the new paths **and add the four modules it currently omits**:
      `menu.js`, `priority.js`, `due-date.js`, `export.js`.
- [ ] `CLAUDE.md` — the line *"The repo root **is** the extension —
      `manifest.json` sits here"* is still true and stays; extend it to note that
      the source now lives under `src/` while the two HTML pages and the manifest
      remain at the root, and say why (the manifest is pinned by Chrome; the pages
      are referenced by unchecked path strings).
- [ ] `CLAUDE.md:146` — the **Testing** section's jsdom snippet contains the
      literal `'<script type="module" src="popup.js"></script>'`, which the reader
      is told to `.replace()` out of the HTML. After Phase 2 that string no longer
      occurs in `popup.html`, so the documented recipe silently stops working.
      Update it to `src="src/popup.js"`.
- [ ] `CLAUDE.md` — the **Architecture rules** and **Traps** sections name files by
      bare filename (`utils.js`, `drag-drop.js`, `popup.js`, `priority.js`,
      `due-date.js`). Those read fine unqualified; change them only where a rule
      is about *where* a file sits. The `utils.js` worker-safety rule and the
      `priority.js` / `due-date.js` module-level-`getElementById` trap are both
      about behaviour, not location — leave them.
- [ ] `README.md` — rewrite the **Project layout** table (lines ~202–212) to the
      new paths, **and add the five modules it currently omits**: `menu.js`,
      `priority.js`, `due-date.js`, `export.js`, `drag-drop.js`.
- [ ] `README.md` — re-read the install instructions (Steps 1–4, and the "wrong
      folder" troubleshooting near line 171). They tell the reader to select the
      folder containing `manifest.json`, which is **still the repo root** and
      therefore still correct. Confirm, do not rewrite.
- [ ] Commit.

## Implementation notes

**This is the phase that is easiest to skip and worst to skip.** The whole point
of the restructure is that the folder communicates the design; a file table still
listing `popup.js` at the root actively undoes that, and `CLAUDE.md` is loaded
into context every session, so a wrong path there misleads on every future task.

**Both tables are incomplete, not merely stale.** `README.md` lists nine rows for
a source tree of ten JS modules plus a stylesheet, omitting five; `CLAUDE.md`
omits four. A pure path substitution would carry both gaps forward at tidier
paths. Since this is the document where a reader first meets the layer names,
group the rows by layer so the table teaches the structure:

| File | Owns |
|---|---|
| `manifest.json` | … |
| `popup.html` | … |
| `reminder.html` | … |
| `src/popup.css` | … |
| `src/popup.js` | … |
| `src/reminder.js` | … |
| `src/background.js` | … |
| `src/core/utils.js` | … |
| `src/ui/menu.js` | … |
| `src/ui/drag-drop.js` | … |
| `src/features/priority.js` | … |
| `src/features/due-date.js` | … |
| `src/features/settings.js` | … |
| `src/features/export.js` | … |

**`CLAUDE.md`'s reminder-window row is also wrong on content, not just path.** It
reads "The daily **HIGH-priority** reminder window", but commit `8f2749c` changed
`reminder.js` to list every outstanding task ordered by priority. The window is
still *triggered* only when a HIGH item exists (`background.js` gates on
`getHighPriorityItems`), so the accurate description is "opens for HIGH-priority
work, lists everything outstanding". Fix it while rewriting the row — a file table
that is right about paths and wrong about behaviour is no better.

**`README.md` mentions "folder" fourteen times**, almost all in install
instructions about *which folder to select in Chrome*. That answer has not
changed. Read each hit before editing; the temptation is to bulk-edit and break
working instructions.

The `.gitignore` contains only `.claude` and has no trailing newline. Out of scope
— but if you touch the file for any reason, add the newline.

## Verify

- Every path in `CLAUDE.md`'s Layout table and `README.md`'s file table resolves:
  pipe each table's path column through `ls` and get no `No such file`.
- Both tables list all ten JS modules. Count the `src/` rows: fourteen rows in
  `CLAUDE.md`'s table, and `README.md`'s covers the same modules.
- `grep -n 'popup\.js\|utils\.js\|popup\.css' README.md CLAUDE.md` shows no
  bare-root path presented as a location.
- The jsdom snippet's `<script>` string occurs verbatim in `popup.html`:
  `grep -F "$(grep -o '<script[^>]*></script>' CLAUDE.md | head -1)" popup.html`
  matches.
- `grep -n 'HIGH-priority reminder window' CLAUDE.md` returns nothing.
- A read-through of `README.md` Steps 1–4 by someone who has not seen the repo
  would land them on the correct folder in `chrome://extensions`.
- `git log --oneline` shows four restructure commits, one per phase 2–5, each
  loading cleanly in `chrome://extensions` on its own.
