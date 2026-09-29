# Phase 4 — Delete the Stale `INSTALL.md`

## Goal

Leave `icons/` holding only image files, by removing the stale install document
rather than relocating it.

## Tasks

- [ ] `git rm icons/INSTALL.md`
- [ ] `grep -rn "INSTALL" README.md CLAUDE.md manifest.json popup.html
      reminder.html` and remove any link that now dangles.
- [ ] `CLAUDE.md:169` has a **Loose ends** bullet reading "`INSTALL.md` is stale:
      it documents the removed click-to-cycle priority behaviour and tells people
      to select an `extension/` folder that does not exist. `README.md`
      supersedes it." Delete that bullet — the loose end is now tied off, and a
      note about a file that no longer exists is itself a loose end.
- [ ] Confirm `ls icons/` shows exactly `icon16.png`, `icon32.png`, `icon48.png`,
      `icon128.png`.
- [ ] Confirm `manifest.json`'s two `icons` blocks still read `icons/iconNN.png`
      — they are untouched by this phase and must stay that way.
- [ ] Commit.

## Implementation notes

**Deleting rather than moving is a deliberate change from the superseded plan**,
which moved the file to `docs/INSTALL.md` and flagged deletion as "probably right,
but a content decision". The decision has been taken: the file is stale in two
specific ways (it documents a priority interaction that was removed, and it tells
the reader to select an `extension/` folder that has never existed in this repo),
and `README.md` already carries correct install steps. Relocating a document that
actively misleads just moves the misleading document.

A markdown file inside the icon folder is an accident of history, not a decision:
`icons/` is referenced by the manifest as an asset directory, and anything
non-image in it ships in the packaged extension for no reason. That is the reason
the file had to be dealt with at all; staleness is why the answer is `rm` rather
than `mv`.

Nothing else in `docs/` needs to move. The two `docs/plans/` folders already sit
where they belong. `CHANGELOG.md` stays at the repo root — Open question 2 in
`plan.md`.

The deletion is recoverable from history if it turns out someone wanted it; that
is what makes this the cheap direction to be wrong in.

## Verify

- `find icons -type f -not -name '*.png'` returns nothing.
- `icons/INSTALL.md` does not exist, and neither does `docs/INSTALL.md` — this
  phase creates no relocated copy.
- `grep -rn "INSTALL" . --exclude-dir=docs --exclude-dir=.git` returns nothing.
- `grep -n "INSTALL" CLAUDE.md` returns nothing.
- Reload in `chrome://extensions`: the toolbar icon still renders at its normal
  size, which confirms the `icons` manifest blocks were not disturbed.
