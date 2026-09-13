# Phase 4 — Scheduled HIGH-Priority Reminder Window

## Goal

At a user-chosen daily time, open a centered window listing only the outstanding
HIGH-priority tasks.

## Tasks

- [ ] Add `"alarms"` to `permissions` and a
      `"background": { "service_worker": "background.js", "type": "module" }`
      entry to `manifest.json`.
- [ ] Add a pure `highPriorityItems(items)` selector to `utils.js` — HIGH and
      not done.
- [ ] Create `background.js`: owns the alarm, reads state on fire, opens the
      reminder window, and re-syncs the alarm on install and on
      `chrome.storage.onChanged`.
- [ ] Create `reminder.html` + `reminder.js`: the centered page. Lists the HIGH
      items, lets each be ticked done, and closes itself.
- [ ] Add the reminder controls (on/off + time) to the settings panel.
- [ ] Add a `chrome.storage.onChanged` listener in `popup.js` so a tick made in
      the reminder window is not lost.
- [ ] Style the reminder page in `popup.css` under a scoping class or its own
      small block, reusing the existing theme tokens.

## Implementation notes

**This is the phase that changes the extension's shape.** Until now the repo is
pure popup — code runs only while `popup.html` is open. A scheduled reminder
cannot live there, so a service worker is unavoidable. Keep it small: alarm
scheduling and window opening, nothing else.

**Scheduling.** One named alarm, `"reminder.daily"`.

```js
chrome.alarms.create("reminder.daily", { when: nextOccurrence(time), periodInMinutes: 1440 });
```

MV3 alarms have a **30-second minimum** and an MV3 service worker is terminated
when idle — this is fine for alarms (the worker is woken to fire one) but means
**no module-level mutable state in `background.js` may be trusted between
events.** Read `chrome.storage.local` on every fire. Clear the alarm with
`chrome.alarms.clear()` when the setting is switched off; the success criterion is
that `chrome.alarms.getAll()` comes back empty.

**Opening the window, centered.**

```js
const { left, top, width, height } = await chrome.windows.getLastFocused();
chrome.windows.create({
  url: "reminder.html",
  type: "popup",
  width: W, height: H,
  left: Math.round(left + (width - W) / 2),
  top: Math.round(top + (height - H) / 2),
});
```

`chrome.windows.create` is chosen over `chrome.action.openPopup()` on purpose:
`openPopup()` has been policy-gated and requires browser focus, while a created
popup window is stable, needs no permission beyond what the manifest already
gains, and is literally a dialog in the middle of the screen. `chrome.windows`
requires **no** permission entry. Guard `getLastFocused()` — it rejects when no
window is open; fall back to unpositioned `create()` rather than throwing inside
the worker where nobody sees the error.

**If there are no HIGH items, do not open the window.** An empty reminder is pure
interruption. This makes `highPriorityItems()` a pure function worth unit-testing
in Node on its own.

**`reminder.js` must not import `popup.js`.** `popup.js` calls
`document.getElementById` at module top level and runs `installMenuDismissal()`
and `handleEventListener()` on load; on a page without those ids it throws before
anything renders. Share `utils.js` (DOM-free, safe) and `popup.css`. Duplicating
~30 lines of row markup in `reminder.js` is the correct trade here — the
alternative is extracting a shared renderer, which drags `drag-drop.js`,
`menu.js`, `priority.js` and `due-date.js` into a page that needs none of them.

**The write race is real and must be handled.** `loadState()`'s `.then` replaces
`state` wholesale — already a documented trap in CLAUDE.md. If the reminder window
ticks an item while the popup is open, the popup's next `saveState()` writes stale
items back and the tick is gone. Fix is one listener, scoped:

```js
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[STORAGE_KEY]) return;
  state = normalizeState(changes[STORAGE_KEY].newValue);
  render();
});
```

Do not generalise this into a sync layer. Note that it also fires for the popup's
own writes, so it re-renders redundantly — acceptable, since `render()` is already
a full rebuild on every change.

**Guard against reload storms.** `background.js` re-syncs the alarm on
`chrome.storage.onChanged`, and the reminder window writes to storage when an
item is ticked. Compare the stored time against the existing alarm and only
recreate when it actually differs, or a tick in the reminder window silently
reschedules the next day's alarm.

**Time is a plain `HH:MM` local string**, matching how `dueDate` is a day-key
string rather than a timestamp (see CLAUDE.md). Use `<input type="time">`, which
reads and writes that format natively. Validate it in `normalizeSettings()`.

## Verify

- `node -e` importing `utils.js`: `highPriorityItems()` returns only HIGH,
  not-done items, and `[]` for an empty or all-done list.
- Load unpacked; `chrome://extensions` shows the service worker registered with
  no errors in its inspector.
- Enable the reminder with a time one minute ahead, with at least one HIGH item
  outstanding. A centered popup window opens listing exactly those items — no
  MEDIUM, no LOW, nothing already done.
- Mark every HIGH item done, set a time one minute ahead. No window opens.
- Disable the reminder. `chrome.alarms.getAll()` in the worker inspector returns
  an empty array.
- With the toolbar popup open, tick an item in the reminder window. The popup
  updates, and adding an item in the popup afterwards does not resurrect it.
- Change the reminder time; confirm exactly one alarm exists afterwards, not two.
- Reload the extension with the reminder enabled. The alarm is re-created on
  `onInstalled` / `onStartup`.
