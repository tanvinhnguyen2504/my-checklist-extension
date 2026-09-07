// Everything the row knows about an item's priority: the pill that displays it
// and the menu that changes it.
//
// The pill is both label and trigger. It does not mutate the item itself --
// the caller passes onPick, because only popup.js knows how to persist and
// re-render.

import { PRIORITY_LABELS, PRIORITY_ORDER } from "./utils.js";
import { closeMenu, toggleMenu } from "./menu.js";

const priorityMenuEl = document.getElementById("priority-menu");

// Renders the pill for `item` and wires it to open the priority menu.
// onPick(priority) is called with the chosen level.
export function attachPriorityTag(tagEl, item, onPick) {
  tagEl.textContent = PRIORITY_LABELS[item.priority];
  tagEl.addEventListener("click", () => {
    toggleMenu(priorityMenuEl, tagEl, buildEntries(item.priority, onPick));
  });
}

function buildEntries(current, onPick) {
  return PRIORITY_ORDER.map((priority) => ({
    label: PRIORITY_LABELS[priority],
    priority,
    checked: priority === current,
    onPick: () => {
      closeMenu();
      onPick(priority);
    },
  }));
}
