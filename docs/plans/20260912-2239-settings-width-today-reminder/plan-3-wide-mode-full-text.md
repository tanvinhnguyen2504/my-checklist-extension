# Phase 3 — Wide Mode and Fully Readable Task Text

## Goal

A width switch in the settings panel that widens the popup and lets long task
text be read in full instead of being cut off with an ellipsis.

## Tasks

- [ ] Add a `WIDTH` constant to `utils.js` (`COMPACT: "compact"`,
      `WIDE: "wide"`) and a `nextWidth()` helper, mirroring `THEME` /
      `nextTheme()`.
- [ ] Validate `settings.width` against `WIDTH` in `normalizeSettings()` so an
      unknown value falls back to `COMPACT`.
- [ ] Apply `document.documentElement.dataset.width = state.settings.width` in
      the existing `setTheme()` — or a renamed `applyAppearance()` that does both.
- [ ] Add the width control to the settings panel from Phase 2.
- [ ] In `popup.css`, add `html[data-width="wide"] body { width: … }` and switch
      `.text` to wrapping under the same selector.
- [ ] Confirm the priority menu still positions correctly at the wider size.

## Implementation notes

**Chrome caps a popup at 800×600 and gives the user no resize handle.** There is
no drag-to-resize to implement; widening means the page asking for more room.
`body { width: 380px }` is the single source of that width, so a
`html[data-width="wide"]` override is the whole mechanism. Pick a wide value at
or below 760px to stay clear of the 800px ceiling — a popup that requests more
gets clipped, not scrolled.

**Width alone does not fix the text.** `.text` is
`overflow: hidden; text-overflow: ellipsis; white-space: nowrap` (`popup.css`),
so a long enough task truncates at any width. Wide mode must also relax that:

```css
html[data-width="wide"] .text {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  overflow-wrap: anywhere;   /* a pasted URL has no break opportunities */
}
```

`.row` is `min-height: 44px` with `align-items: stretch`, so a two-line row grows
correctly and the flag strip stretches with it — no extra layout work.

**`textEl.title = item.text` in `renderRow()` stays.** It is the only way to read
a truncated task in compact mode, and a redundant tooltip in wide mode is
harmless. Removing it would regress compact mode for no gain.

**`data-width` joins `data-theme`, `data-priority`, `data-done` and `data-key` as
a JS↔CSS contract.** Per CLAUDE.md, renaming it in one file silently breaks the
other with no error anywhere. Put it on `<html>`, not `<body>`, so it matches how
`data-theme` already works and can key the `body` width rule.

**The default stays compact.** An existing user who never opens settings sees no
change in their popup's size — a silent 2× width jump on update is a surprise,
not a feature.

**Re-check the priority menu.** `positionMenu()` in `menu.js` clamps against
`window.innerWidth`, which tracks the popup, so it should hold — but the menu is
`position: fixed` inside a page whose width just changed, so open one from a row
near the right edge in both modes and confirm it is not clipped.

## Verify

- Toggle the width control: `document.documentElement.dataset.width` flips and
  the rendered popup visibly changes width.
- Add a task of ~200 characters. In wide mode it is fully visible across multiple
  lines with no ellipsis; in compact mode it truncates and the tooltip shows the
  full text.
- Close and reopen the popup. The chosen width persists.
- In wide mode: the compose row and header remain reachable, `.list` is still the
  only scrolling element, a row's priority menu opens unclipped, and
  double-clicking a wrapped task opens the inline editor on the correct row.
- Add a task that is a single long unbroken URL. It wraps rather than forcing the
  row to overflow horizontally.
