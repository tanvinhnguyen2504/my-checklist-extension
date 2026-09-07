export const STORAGE_KEY = "checklist.v1";

export const PRIORITY = { 
  LOW: 0,
  NORMAL: 1,
  HIGH: 2
};

export const THEME = { 
  LIGHT: "light",
  DARK: "dark",
};

const hasChromeStorage =
  typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

export function loadState() {
  return new Promise((resolve) => {
    if (hasChromeStorage) {
      chrome.storage.local.get([STORAGE_KEY], (result) =>
        resolve(normalizeState(result && result[STORAGE_KEY]))
      );
      return;
    }
    try {
      resolve(normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY))));
    } catch (_) {
      resolve(normalizeState(null));
    }
  });
}

export function saveState(state) {
  if (hasChromeStorage) {
    chrome.storage.local.set({ [STORAGE_KEY]: state });
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
}

// Accepts anything read back from storage and returns a usable state object.
export function normalizeState(saved) {
  if (!saved || !Array.isArray(saved.items)) {
    return { items: [], theme: preferredTheme() };
  }
  return {
    items: saved.items.map((item) => ({
      text: String(item.text ?? ""),
      done: !!item.done,
      priority: Number(item.priority) || PRIORITY.LOW,
      updatedAt: Number(item.updatedAt) || null,
      dueDate: isDayKey(item.dueDate) ? item.dueDate : null,
    })),
    theme: saved.theme === THEME.DARK ? THEME.DARK : THEME.LIGHT,
  };
}

// "!buy milk" -> a high-priority item. Returns null for empty input.
export function parseDraft(rawText) {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const { text: withoutDay, dueDate } = extractDayToken(trimmed);
  const isHighPriority = withoutDay.startsWith("!");
  const text = (isHighPriority ? withoutDay.slice(1) : withoutDay).trim();
  if (!text) return null;

  return {
    text,
    done: false,
    priority: isHighPriority ? PRIORITY.HIGH : PRIORITY.NORMAL,
    updatedAt: Date.now(),
    // New tasks land on today unless an @day token says otherwise.
    dueDate: dueDate || todayKey(),
  };
}

// Menu order: most urgent first. Drives both the popover and its labels.
export const PRIORITY_ORDER = [
  PRIORITY.HIGH,
  PRIORITY.NORMAL,
  PRIORITY.LOW,
];

export const PRIORITY_LABELS = {
  [PRIORITY.HIGH]: "HIGH",
  [PRIORITY.NORMAL]: "MEDIUM",
  [PRIORITY.LOW]: "LOW",
};

export function nextTheme(theme) {
  return theme === THEME.LIGHT ? THEME.DARK : THEME.LIGHT;
}

export function preferredTheme() {
  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? THEME.DARK : THEME.LIGHT;
}

export function countDone(items) {
  return items.filter((item) => item.done).length;
}

export function progressPercent(items) {
  if (!items.length) return 0;
  return Math.round((countDone(items) / items.length) * 100);
}

// Leading-edge debounce: runs fn on the first call, then ignores further calls
// until `wait` ms of quiet have passed. Leading rather than trailing because
// callers here read live DOM values -- deferring the call would read the input
// as it is later, not as it was when the user acted.
export function debounce(fn, wait) {
  let timer = null;
  return (...args) => {
    const isIdle = timer === null;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
    }, wait);
    if (isIdle) fn(...args);
  };
}

export function isAllDone(items) {
  return items.length > 0 && countDone(items) === items.length;
}

// Drives both halves of the mark-all / unmark-all toggle. Items already in the
// target state are returned untouched so a no-op cannot move their timestamp.
export function setAllDone(items, done) {
  return items.map((item) =>
    item.done === done ? item : { ...item, done, updatedAt: Date.now() }
  );
}

// Moves the item at `from` so it lands before position `to`, where `to` is an
// index in the ORIGINAL array. Returns a new array; unchanged if it is a no-op.
export function moveItem(items, from, to) {
  if (from < 0 || from >= items.length) return items;
  if (to < 0 || to > items.length) return items;
  if (to === from || to === from + 1) return items;

  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to > from ? to - 1 : to, 0, moved);
  return next;
}

// Items saved before timestamps existed have no updatedAt; they render blank
// rather than claiming a made-up date.
export function formatDate(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

// Records an edit to an item in place. Every content or state change goes
// through here so the displayed date cannot drift from reality.
export function touchItem(item) {
  item.updatedAt = Date.now();
  return item;
}

// --- days -------------------------------------------------------------
// Days are stored as "YYYY-MM-DD" strings, not timestamps. A timestamp is a
// point in time and would land on a different calendar day depending on the
// reader's timezone; an assigned day has no time component at all.

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_TOKEN_PATTERN = /(?:^|\s)@(\S+)/i;

export function isDayKey(value) {
  return typeof value === "string" && DAY_KEY_PATTERN.test(value);
}

export function toDayKey(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayKey() {
  return toDayKey(new Date());
}

export function shiftDayKey(key, days) {
  const [year, month, day] = key.split("-").map(Number);
  return toDayKey(new Date(year, month - 1, day + days));
}

export function formatDayKey(key) {
  if (!isDayKey(key)) return "";
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
}

// Row-width version of formatDayKey: the year is almost always the current one
// and the row has no space to spend restating it.
export function formatDayKeyShort(key) {
  if (!isDayKey(key)) return "";
  const [, month, day] = key.split("-");
  return `${day}/${month}`;
}

// "TODAY" / "TOMORROW" / "YESTERDAY" / "OVERDUE" read faster than a bare date
// when you are scanning for what to do now.
export function dayGroupLabel(key, reference = todayKey()) {
  if (!isDayKey(key)) return "UNSCHEDULED";
  if (key === reference) return "TODAY";
  if (key === shiftDayKey(reference, 1)) return "TOMORROW";
  if (key === shiftDayKey(reference, -1)) return "YESTERDAY";
  return key < reference ? "OVERDUE" : "UPCOMING";
}

// Accepts "today", "tomorrow", "yesterday", "DD/MM" and "DD/MM/YYYY".
export function parseDayInput(value) {
  const text = String(value).trim().toLowerCase();
  if (!text) return null;
  if (text === "today") return todayKey();
  if (text === "tomorrow") return shiftDayKey(todayKey(), 1);
  if (text === "yesterday") return shiftDayKey(todayKey(), -1);
  if (isDayKey(text)) return text;

  const parts = text.split(/[/.-]/);
  if (parts.length < 2 || parts.length > 3) return null;

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = parts.length === 3 ? Number(parts[2]) : new Date().getFullYear();
  if (!day || !month || !year || month > 12 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  // Rejects impossible dates like 31/02, which Date silently rolls forward.
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return toDayKey(date);
}

// Pulls an "@day" token out of the draft text, returning the text without it.
export function extractDayToken(text) {
  const match = text.match(DAY_TOKEN_PATTERN);
  if (!match) return { text, dueDate: null };

  const dueDate = parseDayInput(match[1]);
  if (!dueDate) return { text, dueDate: null };
  return { text: text.replace(match[0], " ").replace(/\s+/g, " ").trim(), dueDate };
}

// Groups items for display while keeping each item's index into the original
// array, because every row handler addresses state.items by index.
export function groupByDay(items, reference = todayKey()) {
  const groups = new Map();

  items.forEach((item, index) => {
    const key = isDayKey(item.dueDate) ? item.dueDate : "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ item, index });
  });

  return [...groups.entries()]
    .map(([key, entries]) => ({
      key,
      label: dayGroupLabel(key || null, reference),
      date: formatDayKey(key),
      entries,
      done: entries.filter(({ item }) => item.done).length,
    }))
    // Dated groups run oldest first so anything overdue surfaces at the top;
    // unscheduled work sinks to the bottom.
    .sort((a, b) => {
      if (!a.key) return 1;
      if (!b.key) return -1;
      return a.key < b.key ? -1 : 1;
    });
}
