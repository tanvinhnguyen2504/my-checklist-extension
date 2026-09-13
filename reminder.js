import {
  PRIORITY_LABELS,
  PRIORITY,
  formatDayKeyShort,
  highPriorityItems,
  loadState,
  saveState,
  touchItem,
} from "./utils.js";

const listEl = document.getElementById("reminder-list");
const countEl = document.getElementById("reminder-count");
const dismissButtonEl = document.getElementById("btn-dismiss");

let state = null;

function renderRow(item) {
  const row = document.createElement("div");
  row.className = "row";
  row.dataset.priority = String(PRIORITY.HIGH);
  row.dataset.done = "false";

  const flag = document.createElement("div");
  flag.className = "flag";

  const body = document.createElement("div");
  body.className = "body";

  const box = document.createElement("button");
  box.type = "button";
  box.className = "box";
  box.title = "Mark done";

  const text = document.createElement("span");
  text.className = "text";
  text.textContent = item.text;

  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = PRIORITY_LABELS[PRIORITY.HIGH];

  body.append(box, text);
  if (item.dueDate) {
    const due = document.createElement("span");
    due.className = "due";
    due.textContent = formatDayKeyShort(item.dueDate);
    body.append(due);
  }
  body.append(tag);

  // One control, one behaviour. The popup's .body click handler toggles done for
  // anything not explicitly excluded, which is a trap this page simply avoids by
  // wiring the checkbox and nothing else.
  box.addEventListener("click", () => {
    item.done = true;
    touchItem(item);
    saveState(state);
    render();
  });

  row.append(flag, body);
  return row;
}

function renderAllClear() {
  const empty = document.createElement("div");
  empty.className = "empty";

  const heading = document.createElement("strong");
  heading.textContent = "All clear";

  const hint = document.createElement("span");
  hint.textContent = "Nothing high priority is outstanding.";

  empty.append(heading, hint);
  listEl.append(empty);
}

function render() {
  document.documentElement.dataset.theme = state.theme;

  const items = highPriorityItems(state.items);
  countEl.textContent = String(items.length);
  listEl.textContent = "";

  if (!items.length) {
    renderAllClear();
    return;
  }
  items.forEach((item) => listEl.append(renderRow(item)));
}

dismissButtonEl.addEventListener("click", () => window.close());
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    window.close();
  }
});

loadState().then((savedState) => {
  state = savedState;
  render();
});
