# Phase 2 — Settings in State, and a Panel to Edit Them

## Goal

Add a `settings` object to the persisted state and a settings panel to host
preferences, moving the existing theme switch into it.

## Tasks

- [ ] Add a `DEFAULT_SETTINGS` constant and a `normalizeSettings()` helper to
      `utils.js`, and call it from `normalizeState()` so every load returns a
      complete `settings` object.
- [ ] Add the settings trigger to the header in `popup.html` — `btn-settings`,
      a `.chip.icon` next to the existing export button.
- [ ] Add the panel markup: a `#settings-panel` container with one labelled row
      per setting, `hidden` by default.
- [ ] Create `settings.js` owning the panel's open/close and the wiring from each
      control to a `onChange(patch)` callback. It must not import `popup.js`.
- [ ] Move the theme switch out of the header into the panel; delete the `#theme`
      chip and `#theme-label` from `popup.html` and their handler from `popup.js`.
- [ ] Style the panel in `popup.css` using existing tokens only.

## Implementation notes

**Shape.** `settings` carries only new preferences:

```js
const DEFAULT_SETTINGS = {
  width: WIDTH.COMPACT,        // Phase 3 consumes this
  reminder: {                  // Phase 4 consumes this
    enabled: false,
    time: "09:00",
  },
};
```

`theme` deliberately **stays a top-level field**. Moving it under `settings`
would silently reset the theme for every existing user and force
`normalizeState()` to carry a read-from-both-places branch forever. `settings` is
for what is new.

**`normalizeState()` is the only gate.** Per CLAUDE.md it validates and applies
defaults for everything read from storage, so `normalizeSettings(saved.settings)`
belongs there and nowhere else. Write it so a missing `settings`, a `settings`
that is `null`, and a `settings` with only `reminder.enabled` set all produce a
full object — never spread a partial into the live state.

**The panel is a panel, not a `<dialog>`.** The popup is 380×520 with
`overflow: hidden` on `body`; a modal `<dialog>` with a backdrop inside that
frame buys nothing over an in-flow panel and brings focus-trap behaviour that has
to be managed. Render it as a collapsible section between `.track` and `.list`,
or as an absolutely-positioned sheet over `.list`. Either way `.list` keeps being
the only scroll container.

**Do not reuse `menu.js` for this.** `menu.js` owns a single module-scoped
`anchorEl` on the assumption that one popover is open at a time, and it closes on
any outside `pointerdown`. A settings panel stays open while you click controls
inside it, and a priority menu opened from a row must be able to coexist. New
module, separate state.

**The panel lives outside `.list`, which keeps it clear of the `.body` click
trap** documented in CLAUDE.md. Do not place any settings control inside a `.row`
— the catch-all done-toggle on `.body` would fire for it.

**Rendering.** `render()` rebuilds `.list` wholesale, so the panel must not be
inside `listEl` or its open state is destroyed on every keystroke-triggered save.
Add a `renderSettings()` that syncs the controls' displayed values from `state`
and call it from `render()` alongside `renderActions()`.

**Every settings change goes through `saveAndRender()`,** the same path as item
mutations, so persistence and repaint cannot diverge. `touchItem()` is for items
only — settings have no `updatedAt`.

## Verify

- `node -e` importing `utils.js`: `normalizeState(null)`,
  `normalizeState({items: []})`, `normalizeState({items: [], theme: "dark"})`,
  and a state object captured from the current released version all return a
  complete `settings` with defaults, and `theme` still round-trips.
- Open the popup, open the panel, toggle the theme. The page theme changes, the
  panel stays open, and reopening the popup keeps the chosen theme.
- Add an item while the panel is open. The list re-renders and the panel does not
  close or lose its values.
- Open a row's priority menu, then open the panel. Neither control breaks the
  other.
