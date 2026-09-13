import {
  countDone,
  isAllDone,
  loadState,
  groupByDay,
  todayKey,
  moveItem,
  nextTheme,
  normalizeState,
  parseDraft,
  progressPercent,
  saveState,
  setAllDone,
  touchItem,
} from "./utils.js";
import { createDragController } from "./drag-drop.js";
import { closeMenu, installMenuDismissal } from "./menu.js";
import { installSettings, renderSettings } from "./settings.js";
import { attachPriorityTag } from "./priority.js";
import { attachDueChip } from "./due-date.js";
import { downloadCsv } from "./export.js";

const listEl = document.getElementById("list");
const rowTemplate = document.getElementById("row-tpl");
const countEl = document.getElementById("count");
const progressEl = document.getElementById("progress");
const draftEl = document.getElementById("draft");
const settingsPanelEl = document.getElementById("settings-panel");
const settingsButtonEl = document.getElementById("btn-settings");
const checkAllButtonEl = document.getElementById("btn-check-all");
const clearAllButtonEl = document.getElementById("btn-clear-all");
const exportButtonEl = document.getElementById("btn-export-csv");
const addButton = document.getElementById("add");
const groupTemplate = document.getElementById("group-tpl");

const CLEAR_CONFIRM_MS = 3000;

// Placeholder until loadState() resolves. normalizeState rather than a literal,
// so every field the renderers read exists from the first frame.
let state = normalizeState(null);
let clearArmed = false;
let clearTimer = null;
// The pointer press that dismisses an open editor also completes as a click,
// and that click lands on .body -- which would toggle the row off the back of
// a gesture the user meant as "close the editor". Holds the element that press
// landed on, so the click it produces can be ignored exactly once.
let editorDismissedBy = null;

// True when `event` is the click completing the press that just dismissed an
// editor. Matching on the pressed element rather than on a timer is deliberate:
// the gap between mousedown and click is however long the user holds the
// button, which no timeout can bound.
function consumeEditorDismissal(event) {
  if (!editorDismissedBy) return false;
  const pressedEl = editorDismissedBy;
  editorDismissedBy = null;
  return event.target === pressedEl || event.target.contains(pressedEl);
}

function renderEmptyState() {
  const empty = document.createElement("div");
  empty.className = "empty";

  const heading = document.createElement("strong");
  heading.textContent = "Nothing on the list";

  const hint = document.createElement("span");
  hint.textContent = "Type below to add one. Start with ! to flag it high priority.";

  empty.append(heading, hint);
  listEl.append(empty);
}

// Controls inside .body that must not fall through to the done-toggle below.
const BODY_CONTROLS = ".del, .text, .tag, .due";

function renderRow(item, index, dayKey) {
  const row = rowTemplate.content.firstElementChild.cloneNode(true);
  row.dataset.priority = String(item.priority);
  row.dataset.done = String(item.done);
  row.querySelector(".box").textContent = item.done ? "✓" : "";

  const textEl = row.querySelector(".text");
  textEl.textContent = item.text;
  // The label is a single ellipsised line, so the full text is only ever
  // readable from the tooltip.
  textEl.title = item.text;

  attachPriorityTag(row.querySelector(".tag"), item, (priority) => {
    touchItem(item).priority = priority;
    saveAndRender();
  });
  attachDueChip(row.querySelector(".due"), row.querySelector(".due-input"), item, (dayKey) => {
    assignDay(index, dayKey);
    saveAndRender();
  });

  row.querySelector(".body").addEventListener("click", (event) => {
    if (consumeEditorDismissal(event)) return;
    // The text label is the edit target (double-click); toggling it here would
    // re-render the row before dblclick could fire. The rest are controls with
    // their own handlers.
    if (event.target.closest(BODY_CONTROLS)) return;
    item.done = !item.done;
    touchItem(item);
    saveAndRender();
  });
  textEl.addEventListener("dblclick", () => {
    startEditing(row, item);
  });

  row.querySelector(".del").addEventListener("click", () => {
    state.items.splice(index, 1);
    saveAndRender();
  });

  dragController.attachRow(row, index, dayKey);
  return row;
}

function renderGroup(group) {
  const section = groupTemplate.content.firstElementChild.cloneNode(true);
  section.dataset.key = group.key;
  section.dataset.overdue = String(!!group.key && group.key < todayKey());

  const head = section.querySelector(".group-head");
  head.querySelector(".group-label").textContent = group.label;
  head.querySelector(".group-date").textContent = group.date;
  head.querySelector(".group-count").textContent = `${group.done}/${group.entries.length}`;
  dragController.attachGroupHeader(head, group.key || null);

  group.entries.forEach(({ item, index }) =>
    section.append(renderRow(item, index, group.key || null))
  );
  listEl.append(section);
}

// Drag and drop lives in drag-drop.js; these two callbacks are the only places
// a completed drop is allowed to touch the list.
const dragController = createDragController({
  listEl,
  onRowDrop: ({ from, to, dayKey }) => {
    assignDay(from, dayKey);
    state.items = moveItem(state.items, from, to);
    saveAndRender();
  },
  onGroupDrop: ({ from, dayKey }) => {
    assignDay(from, dayKey);
    saveAndRender();
  },
});

// A drop into another day's group is a reassignment, not just a reorder.
function assignDay(index, dayKey) {
  const item = state.items[index];
  if ((item.dueDate || null) === dayKey) return;
  touchItem(item).dueDate = dayKey;
}

function disarmClear() {
  clearTimeout(clearTimer);
  clearTimer = null;
  clearArmed = false;
}

function renderActions() {
  const isEmpty = !state.items.length;
  // One button, two directions: once everything is ticked the only useful move
  // is to untick it, so the button flips rather than going dead.
  const allDone = isAllDone(state.items);
  checkAllButtonEl.disabled = isEmpty;
  checkAllButtonEl.textContent = allDone ? "\u2715 UNMARK ALL" : "\u2713 MARK ALL";
  checkAllButtonEl.title = allDone ? "Clear every tick" : "Mark everything done";
  checkAllButtonEl.dataset.allDone = String(allDone);
  clearAllButtonEl.disabled = isEmpty;
  exportButtonEl.disabled = isEmpty;
  clearAllButtonEl.textContent = clearArmed ? "SURE?" : "CLEAR";
  clearAllButtonEl.dataset.armed = String(clearArmed);
}

// Swaps the label for an input in place. Commits on Enter or blur, reverts on
// Escape, and treats an emptied field as a cancel rather than a delete.
function startEditing(row, item) {
  const textEl = row.querySelector(".text");
  const input = document.createElement("input");
  input.type = "text";
  input.className = "edit";
  input.value = item.text;
  input.spellcheck = false;

  dragController.suspendRow(row);

  // Capture phase, so this runs before the press's default action moves focus
  // and blurs the input -- i.e. before settle() below.
  const notePress = (event) => {
    if (!input.contains(event.target)) editorDismissedBy = event.target;
  };
  document.addEventListener("mousedown", notePress, true);

  let settled = false;
  const settle = (commit) => {
    if (settled) return;
    settled = true;
    document.removeEventListener("mousedown", notePress, true);

    const nextText = input.value.trim();
    if (commit && nextText && nextText !== item.text) {
      item.text = nextText;
      touchItem(item);
      saveAndRender();
      return;
    }
    dragController.resumeRow(row);
    input.replaceWith(textEl);
  };

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") settle(true);
    else if (event.key === "Escape") settle(false);
  });
  input.addEventListener("blur", () => settle(true));

  textEl.replaceWith(input);
  input.focus();
  input.select();
}

function setTheme() {
  document.documentElement.dataset.theme = state.theme;
}

function renderProgress() {
  countEl.textContent = `${countDone(state.items)} of ${state.items.length}`;
  progressEl.style.width = `${progressPercent(state.items)}%`;

}

function render() {
  setTheme()
  renderProgress()
  renderActions()
  renderSettings(state)

  listEl.textContent = "";

  if (!state.items.length) {
    renderEmptyState();
    return;
  }
  groupByDay(state.items).forEach(renderGroup);
}

function saveAndRender() {
  saveState(state);
  render();
}

function addItem() {
  const item = parseDraft(draftEl.value);
  if (!item) return;

  state.items.push(item);
  draftEl.value = "";
  disarmClear();
  saveAndRender();
}

function handleEventListener() {
  addButton.addEventListener("click", addItem);
  draftEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      addItem();
    }
  });
  checkAllButtonEl.addEventListener("click", () => {
    state.items = setAllDone(state.items, !isAllDone(state.items));
    disarmClear();
    saveAndRender();
  });
  clearAllButtonEl.addEventListener("click", () => {
    if (!clearArmed) {
      clearArmed = true;
      clearTimer = setTimeout(() => {
        clearArmed = false;
        render();
      }, CLEAR_CONFIRM_MS);
      render();
      return;
    }
    disarmClear();
    state.items = [];
    saveAndRender();
  });
  // Backstop: a press that dismissed an editor without producing a click on a
  // row (pressing the header, say) would otherwise leave the flag set and eat
  // the next genuine click. document is above .body, so this runs after it.
  document.addEventListener("click", () => {
    editorDismissedBy = null;
  });
  listEl.addEventListener("scroll", closeMenu);
  exportButtonEl.addEventListener("click", () => {
    downloadCsv(state.items);
  });
}

installMenuDismissal();
installSettings({
  panel: settingsPanelEl,
  trigger: settingsButtonEl,
  onToggleTheme: () => {
    state.theme = nextTheme(state.theme);
    saveAndRender();
  },
});
handleEventListener();

loadState().then((savedState) => {
  state = savedState;
  render();
  draftEl.focus();
});
