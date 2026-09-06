import {
  THEME,
  countDone,
  loadState,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  groupByDay,
  todayKey,
  markAllDone,
  moveItem,
  nextTheme,
  parseDraft,
  progressPercent,
  saveState,
  touchItem,
} from "./utils.js";
import { createDragController } from "./drag-drop.js";

const listEl = document.getElementById("list");
const rowTemplate = document.getElementById("row-tpl");
const countEl = document.getElementById("count");
const progressEl = document.getElementById("progress");
const draftEl = document.getElementById("draft");
const themeButton = document.getElementById("theme");
const themeLabelEl = document.getElementById("theme-label");
const checkAllButtonEl = document.getElementById("btn-check-all");
const clearAllButtonEl = document.getElementById("btn-clear-all");
const addButton = document.getElementById("add");
const priorityMenuEl = document.getElementById("priority-menu");
const groupTemplate = document.getElementById("group-tpl");

const CLEAR_CONFIRM_MS = 3000;

let state = { items: [], theme: THEME.LIGHT };
let clearArmed = false;
let clearTimer = null;
let menuAnchorEl = null;
let openMenuEl = null;

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

function renderRow(item, index, dayKey) {
  const row = rowTemplate.content.firstElementChild.cloneNode(true);
  row.dataset.priority = String(item.priority);
  row.dataset.done = String(item.done);
  row.querySelector(".text").textContent = item.text;
  row.querySelector(".box").textContent = item.done ? "✓" : "";
  row.querySelector(".tag").textContent = PRIORITY_LABELS[item.priority];

  row.querySelector(".body").addEventListener("click", (event) => {
    if (event.target.closest(".del")) return;
    // The text label is the edit target (double-click); toggling it here would
    // re-render the row before dblclick could fire.
    if (event.target.closest(".text")) return;
    item.done = !item.done;
    touchItem(item);
    saveAndRender();
  });
  row.querySelector(".text").addEventListener("dblclick", () => {
    startEditing(row, item);
  });

  const flagEl = row.querySelector(".flag");
  flagEl.addEventListener("click", () => {
    if (menuAnchorEl === flagEl) {
      closeMenu();
      return;
    }
    openPriorityMenu(flagEl, index);
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
  checkAllButtonEl.disabled =
    isEmpty || countDone(state.items) === state.items.length;
  clearAllButtonEl.disabled = isEmpty;
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

  let settled = false;
  const settle = (commit) => {
    if (settled) return;
    settled = true;

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

function closeMenu() {
  if (!menuAnchorEl) return;
  menuAnchorEl.setAttribute("aria-expanded", "false");
  menuAnchorEl = null;
  openMenuEl.hidden = true;
  openMenuEl.textContent = "";
  openMenuEl = null;
}

function buildMenuItem({ label, priority = null, checked = false, onPick }) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "menu-item";
  item.role = "menuitemradio";
  item.setAttribute("aria-checked", String(checked));

  if (priority !== null) {
    item.dataset.priority = String(priority);
    const dot = document.createElement("span");
    dot.className = "menu-dot";
    item.append(dot);
  }

  const labelEl = document.createElement("span");
  labelEl.className = "menu-label";
  labelEl.textContent = label;

  const check = document.createElement("span");
  check.className = "menu-check";
  check.textContent = "\u2713";

  item.append(labelEl, check);
  item.addEventListener("click", onPick);
  return item;
}

// Anchors the menu to its trigger, flipping above when there is no room below.
// Fixed positioning so the scrolling list cannot clip it.
function positionMenu(menuEl, anchorEl) {
  const anchor = anchorEl.getBoundingClientRect();
  const menu = menuEl.getBoundingClientRect();
  const margin = 6;

  const fitsBelow = anchor.bottom + menu.height + margin <= window.innerHeight;
  const top = fitsBelow ? anchor.bottom + 2 : anchor.top - menu.height - 2;
  const left = Math.min(anchor.left, window.innerWidth - menu.width - margin);

  menuEl.style.top = `${Math.max(margin, top)}px`;
  menuEl.style.left = `${Math.max(margin, left)}px`;
}

function openMenu(menuEl, anchorEl, entries) {
  closeMenu();

  entries.forEach((entry) => menuEl.append(buildMenuItem(entry)));

  menuAnchorEl = anchorEl;
  openMenuEl = menuEl;
  anchorEl.setAttribute("aria-expanded", "true");
  menuEl.hidden = false;
  positionMenu(menuEl, anchorEl);

  const items = [...menuEl.querySelectorAll(".menu-item")];
  (items.find((el) => el.getAttribute("aria-checked") === "true") || items[0]).focus();
}

function openPriorityMenu(anchorEl, index) {
  const current = state.items[index].priority;
  openMenu(
    priorityMenuEl,
    anchorEl,
    PRIORITY_ORDER.map((priority) => ({
      label: PRIORITY_LABELS[priority],
      priority,
      checked: priority === current,
      onPick: () => {
        touchItem(state.items[index]).priority = priority;
        closeMenu();
        saveAndRender();
      },
    }))
  );
}

function moveMenuFocus(step) {
  const items = [...openMenuEl.querySelectorAll(".menu-item")];
  const current = items.indexOf(document.activeElement);
  const next = (current + step + items.length) % items.length;
  items[next].focus();
}

function setTheme() {
  document.documentElement.dataset.theme = state.theme;
  themeLabelEl.textContent = state.theme === THEME.LIGHT ? "LIGHT" : "DARK";
}

function renderProgress() {
  countEl.textContent = `${countDone(state.items)} of ${state.items.length}`;
  progressEl.style.width = `${progressPercent(state.items)}%`;

}

function render() {
  setTheme()
  renderProgress()
  renderActions()

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

function handleEventListner() {
  addButton.addEventListener("click", addItem);
  draftEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      addItem();
    }
  });
  checkAllButtonEl.addEventListener("click", () => {
    state.items = markAllDone(state.items);
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
  document.addEventListener("keydown", (event) => {
    if (!menuAnchorEl) return;
    if (event.key === "Escape") {
      const anchorEl = menuAnchorEl;
      closeMenu();
      anchorEl.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveMenuFocus(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveMenuFocus(-1);
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (!menuAnchorEl) return;
    if (openMenuEl.contains(event.target) || event.target === menuAnchorEl) return;
    closeMenu();
  });
  listEl.addEventListener("scroll", closeMenu);
  themeButton.addEventListener("click", () => {
    state.theme = nextTheme(state.theme);
    saveAndRender();
  });
}

handleEventListner()

loadState().then((savedState) => {
  state = savedState;
  render();
  draftEl.focus();
});
