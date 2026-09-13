// The settings panel: preferences that are not part of the list itself.
//
// Deliberately NOT built on menu.js. That module keeps a single module-scoped
// anchor on the assumption that one popover is open at a time, and closes on any
// outside pointerdown. This panel stays open while you click the controls inside
// it, and a row's priority menu has to be able to coexist with it.
//
// The panel lives outside .list for two reasons: render() rebuilds .list
// wholesale, which would destroy the panel's open state on every save, and
// .body's catch-all click handler toggles done for anything placed in a row.

import { THEME, WIDTH } from "./utils.js";

let panelEl = null;
let triggerEl = null;
let themeSwitchEl = null;
let widthSwitchEl = null;

export function isSettingsOpen() {
  return panelEl !== null && !panelEl.hidden;
}

export function closeSettings() {
  if (!isSettingsOpen()) return;
  panelEl.hidden = true;
  triggerEl.setAttribute("aria-expanded", "false");
}

function toggleSettings() {
  const opening = panelEl.hidden;
  panelEl.hidden = !opening;
  triggerEl.setAttribute("aria-expanded", String(opening));
  if (opening) themeSwitchEl.focus();
}

// Syncs the controls from state. Called on every render, because a preference can
// change from somewhere other than its own switch.
export function renderSettings(state) {
  themeSwitchEl.setAttribute("aria-checked", String(state.theme === THEME.DARK));
  widthSwitchEl.setAttribute("aria-checked", String(state.settings.width === WIDTH.WIDE));
}

export function installSettings({ panel, trigger, onToggleTheme, onToggleWidth }) {
  panelEl = panel;
  triggerEl = trigger;
  themeSwitchEl = panel.querySelector("#set-theme");
  widthSwitchEl = panel.querySelector("#set-width");

  triggerEl.addEventListener("click", toggleSettings);
  themeSwitchEl.addEventListener("click", onToggleTheme);
  widthSwitchEl.addEventListener("click", onToggleWidth);

  // Escape closes the panel, matching how the priority menu already behaves.
  // The menu installs its own Escape handler and returns early when no menu is
  // open, so the two do not fight over the key.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isSettingsOpen()) return;
    closeSettings();
    triggerEl.focus();
  });
}
