# Phase 3 — Move the Stylesheet into `src/`

## Goal

Relocate `popup.css` to `src/popup.css` and repoint the `<link>` tag in both HTML
pages.

## Tasks

- [ ] `git mv popup.css src/popup.css`
- [ ] `popup.html:6`: `<link rel="stylesheet" href="popup.css">` →
      `href="src/popup.css"`.
- [ ] `reminder.html:6`: the same edit.
- [ ] Re-read the two prose references to the stylesheet — `src/popup.js:250` and
      `src/ui/menu.js:33`. Both name it as a bare filename (`popup.css`) rather
      than a location, so both are still accurate and should be left alone.
      Change them only if a comment asserts *where* the file sits.
- [ ] Commit separately from Phase 2.

## Implementation notes

`popup.css` has **no `url()` references and no `@import`** — no fonts, no
background images. Verified by grep. That is why this move is a one-line-per-page
change and not a hunt for broken relative asset paths.

**This is the one file both pages share.** `reminder.html` links the same
stylesheet as `popup.html`, which is exactly why the file lands at `src/` top
level rather than inside a page-specific folder. Forgetting the second `<link>`
produces a reminder window that opens, works, and is completely unstyled — with
no console error, because a missing stylesheet is not a script failure. Both
pages currently link it at line 6, which makes the pair easy to miss precisely
because they look identical.

The name `popup.css` stays. It is now mildly wrong, since it styles both pages,
but renaming and moving in the same commit obscures both; the rename is logged as
Open question 1 in `plan.md`.

## Verify

- `git log --stat -M -1` shows `popup.css → src/popup.css` as a rename, plus the
  two HTML edits.
- `ls *.css` returns nothing.
- `grep -rn 'href="popup.css"' .` returns nothing outside `docs/plans/`.
- `grep -rn 'href="src/popup.css"' *.html` returns **two** hits, one per page.
- Reload in `chrome://extensions` and open the popup: it is styled, the theme
  switch still flips light/dark, and the wide-mode switch still changes the
  popup's width — all three are CSS-driven off `data-theme` / `data-width`.
- Trigger the reminder window and confirm **it is styled too**. This is the check
  the phase exists for.
