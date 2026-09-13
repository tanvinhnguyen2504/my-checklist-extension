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
let reminderSwitchEl = null;
let reminderTimeEl = null;
let reminderTimeRowEl = null;

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

  const { enabled, time } = state.settings.reminder;
  reminderSwitchEl.setAttribute("aria-checked", String(enabled));
  // A time with no reminder to attach it to is just clutter.
  reminderTimeRowEl.hidden = !enabled;
  // Assigning unconditionally would fight the user mid-edit, because an
  // <input type="time"> reports a change per field as it is filled in.
  if (reminderTimeEl.value !== time) reminderTimeEl.value = time;
}

export function installSettings({
  panel,
  trigger,
  onToggleTheme,
  onToggleWidth,
  onToggleReminder,
  onPickReminderTime,
}) {
  panelEl = panel;
  triggerEl = trigger;
  themeSwitchEl = panel.querySelector("#set-theme");
  widthSwitchEl = panel.querySelector("#set-width");
  reminderSwitchEl = panel.querySelector("#set-reminder");
  reminderTimeEl = panel.querySelector("#set-reminder-time");
  reminderTimeRowEl = panel.querySelector("#set-reminder-time-row");

  triggerEl.addEventListener("click", toggleSettings);
  themeSwitchEl.addEventListener("click", onToggleTheme);
  widthSwitchEl.addEventListener("click", onToggleWidth);
  reminderSwitchEl.addEventListener("click", onToggleReminder);
  // "change" rather than "input": input fires on every field of the time control,
  // so it would report half-typed times like "0:30".
  reminderTimeEl.addEventListener("change", () => onPickReminderTime(reminderTimeEl.value));

  // Escape closes the panel, matching how the priority menu already behaves.
  // The menu installs its own Escape handler and returns early when no menu is
  // open, so the two do not fight over the key.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isSettingsOpen()) return;
    closeSettings();
    triggerEl.focus();
  });
}
