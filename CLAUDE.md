# CLAUDE.md

Chrome Manifest V3 extension: a toolbar popup todo checklist. No build step, no
framework, no dependencies. The repo root *is* the extension — `manifest.json`
sits here, and that is the folder you point `chrome://extensions` at.

## Layout

| File | Owns |
| --- | --- |
| `manifest.json` | MV3 definition. `storage` permission only, no host permissions |
| `popup.html` | Markup + `row-tpl` / `group-tpl` templates + the priority menu container |
| `popup.css` | Theme tokens and all styling |
| `popup.js` | DOM rendering and event wiring. No business logic |
| `utils.js` | Storage, parsing, dates, grouping. **No DOM access** |
| `drag-drop.js` | HTML5 drag events, drop markers, and the dragged-row state |

`popup.html` loads `popup.js` with `type="module"`, so ES `import`/`export`
works across all three scripts. Adding a new script means adding it as an import,
not a second `<script>` tag.

## Architecture rules

- **`utils.js` stays DOM-free.** It is the only part that is directly testable
  in Node. Anything that can be expressed as a pure function of the state
  belongs there, not in `popup.js`.
- **`drag-drop.js` never touches the todo list.** It reports a completed drop as
  indices plus a target day key through `onRowDrop` / `onGroupDrop`, and
  `popup.js` decides what that means.
- **`render()` rebuilds every row from the template.** There is no partial
  re-render. Any handler that mutates state calls `saveAndRender()`, which
  replaces the DOM nodes the handler was attached to.

## Data model

State is `{ items: [], theme }`, saved under `chrome.storage.local` key
`checklist.v1` (`STORAGE_KEY`), with a `localStorage` fallback so the popup also
runs from a plain page during testing.

An item is:

```js
{
  text: "pay rent",
  done: false,
  priority: 2,          // PRIORITY.LOW 0 | NORMAL 1 | HIGH 2
  updatedAt: 1788666742704,  // epoch ms, or null for items predating the field
  dueDate: "2026-09-06",     // "YYYY-MM-DD" day key; new tasks default to today,
                             // null only for legacy items or a drop on UNSCHEDULED
}
```

**`dueDate` is a day-key string, deliberately not a timestamp.** An assigned day
has no time component; storing an instant would make the same task land on a
different calendar day depending on the reader's timezone. The format also sorts
as plain text and is exactly what `<input type="date">` reads and writes.

`normalizeState()` is the single gate for anything read from storage — it
validates, applies defaults, and is where a future migration goes. It does not
backfill `updatedAt`; missing stamps render blank rather than claiming a date.

Every content or state change to an item goes through `touchItem(item)` so the
displayed modified date cannot drift. Reordering does not stamp — that changes
list position, not the item.

## Conventions

- Element handles are `const somethingEl` / `somethingButtonEl`, ids are
  kebab-case with a `btn-` prefix for buttons (`btn-check-all`).
- Priority levels are `PRIORITY.*` constants, never bare `0`/`1`/`2`.
- `PRIORITY_ORDER` drives menu order; `PRIORITY_LABELS` drives menu text.
- The CSS keys off `data-priority`, `data-done`, and `data-key` on rows and
  groups. **These attribute names are a contract with `popup.css`** — renaming
  one in JS alone silently breaks the styling with no error anywhere.

## Traps this codebase has already hit

- **`.body` has a catch-all click handler that toggles `done`.** Every control
  placed inside the row body inherits that behaviour unless explicitly excluded.
  `.del`, `.text`, and the since-removed `.due` chip each needed a `closest()`
  guard added after the fact. A new in-row control will hit this too. Inverting the check so `.body`
  only toggles for `.box` and blank space would close it permanently.
- **Single-click-to-toggle and double-click-to-edit cannot share a target.** A
  double-click sends two `click` events *first*; each one re-renders, so the
  `dblclick` then fires on a node no longer in the document and the edit opens
  on an orphaned row — invisible, no error. This is why clicking a task's text
  does not tick it off.
- **Never re-render during a drag.** Rebuilding the rows destroys the node the
  browser is dragging and aborts the gesture. Hover state is CSS classes only;
  the list changes on `drop`.
- **`dragover` must call `preventDefault()`** or `drop` never fires, and a drag
  needs `dataTransfer.setData()` or Firefox refuses to start it.
- **`loadState()` is async and its `.then` replaces `state` wholesale.** Items
  added in the milliseconds before storage resolves are silently discarded.
  Known, unfixed, hard to hit in practice.

## Testing

There is no test framework in the repo. Verification is done by driving the real
files in `jsdom` from the scratchpad directory:

```js
const dom = new JSDOM(html.replace('<script type="module" src="popup.js"></script>', ""));
global.window = dom.window; global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
await import("./popup.mjs");
```

`utils.js` can be imported directly in Node with only a `window.matchMedia` stub.

Two things that matter when writing these tests:

- Dispatch the **real event sequence**, not the convenient one. Dispatching
  `dblclick` alone hides the two-clicks-first bug described above.
- jsdom events have no `dataTransfer`; stub it as
  `{ setData(){}, effectAllowed:"", dropEffect:"" }` or every drag handler throws.

## Loose ends

- `INSTALL.md` is stale: it documents the removed click-to-cycle priority
  behaviour and tells people to select an `extension/` folder that does not
  exist. `README.md` supersedes it.
- `debounce()` and `formatDate()` in `utils.js` are exported but unused.
  `debounce()` was a leading-edge guard against rapid-Enter duplicate adds and
  was later unwired; `formatDate()` rendered the per-row modified stamp that the
  row no longer shows.
- A suspected IME interaction (Vietnamese Telex) may produce a duplicate `Enter`
  keydown when adding items. Guard is `if (event.key === "Enter" &&
  !event.isComposing)`; not applied, cause unconfirmed.
