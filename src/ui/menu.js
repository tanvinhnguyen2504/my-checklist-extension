// The popover menu shared by the row's entity controls.
//
// This module owns the menu DOM, where it is positioned, and the one piece of
// mutable state a popover needs -- which trigger opened it. It knows nothing
// about todo items: a caller hands it a trigger element and a list of entries,
// and gets keyboard handling and dismissal for free.
//
// Only one menu is open at a time, which is why the state can live here as
// module scope rather than being threaded through every caller.

let anchorEl = null;
let menuEl = null;

export function isMenuOpen() {
  return anchorEl !== null;
}

export function menuAnchor() {
  return anchorEl;
}

export function closeMenu() {
  if (!anchorEl) return;
  anchorEl.setAttribute("aria-expanded", "false");
  anchorEl = null;
  menuEl.hidden = true;
  menuEl.textContent = "";
  menuEl = null;
}

// `priority` is the one entity-shaped hook in an otherwise generic menu: the
// CSS colours the swatch from .menu-item[data-priority], and that attribute
// name is a contract with popup.css. Entries without one render no swatch.
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
  check.textContent = "✓";

  item.append(labelEl, check);
  item.addEventListener("click", onPick);
  return item;
}

// Anchors the menu to its trigger, flipping above when there is no room below.
// Fixed positioning so the scrolling list cannot clip it.
function positionMenu(el, triggerEl) {
  const anchor = triggerEl.getBoundingClientRect();
  const menu = el.getBoundingClientRect();
  const margin = 6;

  const fitsBelow = anchor.bottom + menu.height + margin <= window.innerHeight;
  const top = fitsBelow ? anchor.bottom + 2 : anchor.top - menu.height - 2;
  const left = Math.min(anchor.left, window.innerWidth - menu.width - margin);

  el.style.top = `${Math.max(margin, top)}px`;
  el.style.left = `${Math.max(margin, left)}px`;
}

export function openMenu(el, triggerEl, entries) {
  closeMenu();

  entries.forEach((entry) => el.append(buildMenuItem(entry)));

  anchorEl = triggerEl;
  menuEl = el;
  triggerEl.setAttribute("aria-expanded", "true");
  el.hidden = false;
  positionMenu(el, triggerEl);

  const items = [...el.querySelectorAll(".menu-item")];
  (items.find((item) => item.getAttribute("aria-checked") === "true") || items[0]).focus();
}

// Clicking a trigger that is already showing its menu closes it, so every
// caller wiring a trigger wants this rather than openMenu() directly.
export function toggleMenu(el, triggerEl, entries) {
  if (anchorEl === triggerEl) {
    closeMenu();
    return;
  }
  openMenu(el, triggerEl, entries);
}

function moveMenuFocus(step) {
  const items = [...menuEl.querySelectorAll(".menu-item")];
  const current = items.indexOf(document.activeElement);
  items[(current + step + items.length) % items.length].focus();
}

// Escape and the arrow keys, plus click-outside. Wired once at startup so
// popup.js does not have to carry menu concerns in its event setup.
export function installMenuDismissal() {
  document.addEventListener("keydown", (event) => {
    if (!anchorEl) return;
    if (event.key === "Escape") {
      const triggerEl = anchorEl;
      closeMenu();
      triggerEl.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveMenuFocus(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveMenuFocus(-1);
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (!anchorEl) return;
    if (menuEl.contains(event.target) || event.target === anchorEl) return;
    closeMenu();
  });
}
