# Phase 6 — Reorder the List by Priority When One Changes

## Goal

When a task's priority is changed, resort the list so tasks read HIGH → MEDIUM →
LOW within their day.

## Tasks

- [ ] Add a pure `sortByPriority(items)` to `utils.js`, ranking via
      `PRIORITY_ORDER` rather than the raw numbers.
- [ ] Call it from the one place priority actually changes — the
      `attachPriorityTag` callback in `renderRow()` (`popup.js:92`) — after the
      mutation and before `saveAndRender()`.
- [ ] Node check: the rank comes from `PRIORITY_ORDER`, the sort is stable, and no
      timestamp moves.
- [ ] jsdom scenario: changing a row to HIGH moves **that** row to the top of its
      group, and the row controls still address the right items afterwards.
- [ ] Update the "Everyday actions" table in `README.md` to say the list resorts.

## Implementation notes

**A global stable sort is all this needs — no per-group logic.** This is the one
thing worth internalising before writing any code. `groupByDay()` buckets items
by day and orders the *sections* by day rank, so array order is only ever
observable *within* a section. A single stable sort of the flat array therefore
leaves every group internally priority-ordered, with equal-priority items keeping
their existing relative order. Verified against the real `groupByDay`:

```
before        TODAY: a-low,c-high,d-med,f-high   TOMORROW: b-high,e-low
global sort   TODAY: c-high,f-high,d-med,a-low   TOMORROW: b-high,e-low
```

Any design that walks the groups and sorts each one is doing the same work the
long way round.

**Rank from `PRIORITY_ORDER`, not from the numbers.** `PRIORITY_ORDER` is already
`[HIGH, NORMAL, LOW]` and CLAUDE.md names it as the thing that drives menu order.
Deriving the sort from it means the list order and the menu order cannot drift,
and the sort does not silently depend on `HIGH` happening to be the largest
number:

```js
export function sortByPriority(items) {
  const rank = (item) => PRIORITY_ORDER.indexOf(item.priority);
  return [...items].sort((a, b) => rank(a) - rank(b));
}
```

Return a new array like `moveItem()` and `setAllDone()` do, rather than sorting in
place — `state.items = sortByPriority(state.items)` reads the same as the existing
reorder call sites.

**`sortByPriority` must not stamp anything.** CLAUDE.md is explicit: *"Reordering
does not stamp — that changes list position, not the item."* The priority change
itself already goes through `touchItem()` one line earlier, which is correct and
sufficient. A resort that touched timestamps would make the modified date drift on
every unrelated row.

**There is exactly one call site.** Grepped, not assumed: the only runtime path
that changes an existing item's priority is the `attachPriorityTag` callback at
`popup.js:92`. `.flag` in `popup.html` carries `title="Set priority"` but is never
queried in any JS file — it is a dead button, and `README.md:129` still documents
it. Leave both alone; pre-existing, and noted in `plan.md`'s Open questions.

**Indices survive because `saveAndRender()` rebuilds everything.** Every row
handler closes over an `index` into `state.items`, and a resort invalidates all of
them — but the handler's very next statement is `saveAndRender()`, which throws
away every row and re-derives fresh indices from the sorted array. The closed-over
`item` is an object reference, so it follows its own object through the sort. The
order of operations inside the callback is the whole safety argument, so keep it:
mutate, stamp, sort, save-and-render.

**This intentionally does not fight drag-and-drop.** The resort is an *effect of
changing a priority*, not an invariant of the list. Dragging a LOW row above a
HIGH one still works and still persists; it is simply undone the next time a
priority in that list changes. Making priority order an invariant instead would
make within-day dragging pointless, since the next `render()` would discard it —
see Open questions.

## Verify

- `node` check against the real `utils.js`:
  - `sortByPriority` orders `[LOW, HIGH, NORMAL]` as `[HIGH, NORMAL, LOW]`.
  - Two items of equal priority keep their input order (stability).
  - Every `updatedAt` in the output equals its input value.
  - The input array is not mutated.
  - An empty list and a single-item list come back unchanged.
- jsdom scenario, with a day holding LOW, MEDIUM, HIGH in that order:
  - Open the last row's priority menu, pick HIGH. The group now reads
    HIGH, HIGH, MEDIUM, LOW and the moved row is the one whose text was changed.
  - Only the changed item's `updatedAt` differs from before.
  - The `×` on the top row afterwards deletes the row you clicked, not the item
    that used to hold that index.
  - Changing a priority does not move a task to a different day group.
  - The settings panel, if open, stays open.
- Manual: in a loaded extension, drag a LOW row above a HIGH row, reopen the
  popup, and confirm the drag order persisted — the sort must not run on render.

## Commit

One commit, matching the existing history's style:

```
feat(row): reorder the list by priority when one changes
```

Touches `utils.js`, `popup.js`, `README.md`.
