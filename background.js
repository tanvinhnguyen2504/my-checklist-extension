import { highPriorityItems, loadState, nextReminderTime } from "./utils.js";

const ALARM_NAME = "reminder.daily";
const DAY_IN_MINUTES = 1440;
const WINDOW_WIDTH = 440;
const WINDOW_HEIGHT = 520;

// Creates, updates, or clears the alarm to match the saved setting.
async function syncAlarm() {
  const state = await loadState();
  const { enabled, time } = state.settings.reminder;
  const existing = await chrome.alarms.get(ALARM_NAME);

  if (!enabled) {
    if (existing) {
      await chrome.alarms.clear(ALARM_NAME);
    }
    return;
  }

  // This runs on every storage write, including the reminder window ticking an
  // item off. Recreating the alarm each time would quietly push the next one
  // further away, so only touch it when the target has actually moved.
  const when = nextReminderTime(time);
  if (existing && Math.abs(existing.scheduledTime - when) < 60_000) {
    return;
  }

  await chrome.alarms.create(ALARM_NAME, { when, periodInMinutes: DAY_IN_MINUTES });
}

// Centred on whichever browser window the user was last in, which is what makes
// this read as a dialog rather than as a stray window.
async function openReminderWindow() {
  const position = {};
  try {
    const { left, top, width, height } = await chrome.windows.getLastFocused();
    position.left = Math.round(left + (width - WINDOW_WIDTH) / 2);
    position.top = Math.round(top + (height - WINDOW_HEIGHT) / 2);
  } catch (_) {
    // getLastFocused rejects when no window is open. Let the browser place it
    // rather than throwing in a worker where the error would go unseen.
  }

  await chrome.windows.create({
    url: "reminder.html",
    type: "popup",
    focused: true,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    ...position,
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) {
    return;
  }

  const state = await loadState();
  // Re-checked rather than trusted: the alarm may outlive the setting being
  // switched off, if the worker was asleep when that happened.
  if (!state.settings.reminder.enabled) {
    return;
  }
  // An empty reminder is pure interruption, so there is nothing to show.
  if (!highPriorityItems(state.items).length) {
    return;
  }

  await openReminderWindow();
});

chrome.runtime.onInstalled.addListener(syncAlarm);
chrome.runtime.onStartup.addListener(syncAlarm);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") {
    syncAlarm();
  }
});
