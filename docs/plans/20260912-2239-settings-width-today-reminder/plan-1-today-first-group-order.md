# Phase 1 — TODAY Renders First

## Goal

Reorder the day groups so TODAY is the first section in the list, with no
programmatic scrolling anywhere.

## Tasks

- [ ] Replace the sort comparator in `groupByDay()` (`utils.js`, end of file) so
      groups come out in the order: TODAY, OVERDUE (most recent first), UPCOMING
      (soonest first), UNSCHEDULED last.
- [ ] Keep `reference = todayKey()` as the comparator's notion of "today" —
      it is already a parameter, which is what makes the function testable
      without mocking the clock.
- [ ] Write a Node check in the scratchpad that imports `utils.js` directly
      (only a `window.matchMedia` stub needed) and asserts the label order for a
      fixture spanning yesterday / today / tomorrow / next week / unscheduled.

## Implementation notes

- The current comparator is ascending-with-unscheduled-last, which is precisely
  why OVERDUE floats above TODAY. Sort by a computed rank first, then by day key
  within the rank:

  | Rank | Group | Within-rank order |
  |---|---|---|
  | 0 | `key === reference` (TODAY) | single group |
  | 1 | `key < reference` (OVERDUE / YESTERDAY) | descending — most recently missed first |
  | 2 | `key > reference` (TOMORROW / UPCOMING) | ascending — soonest first |
  | 3 | `!key` (UNSCHEDULED) | single group |

- `dayGroupLabel()` is unchanged. It already returns TODAY / TOMORROW /
  YESTERDAY / OVERDUE / UPCOMING / UNSCHEDULED from the same `reference`, and
  the labels stay correct no matter what order the sections appear in.
- **Do not touch `renderGroup()` or `render()`.** `render()` already does
  `groupByDay(state.items).forEach(renderGroup)`, so a new order is picked up
  for free. Any change in `popup.js` in this phase is a sign the logic leaked
  out of `utils.js`.
- **Do not add a `scrollIntoView()` call.** Group headers are
  `position: sticky; top: 0` against `.list` as the scroll container
  (`popup.css`); scrolling the list on open would park the TODAY header mid-list
  with sections silently hidden above it. Ordering is the whole fix.
- `drag-drop.js` is unaffected: `renderRow(item, index, dayKey)` passes the
  item's index into the original `state.items`, and `groupByDay` preserves those
  indices regardless of group order. Verify by dragging, do not assume.

## Verify

- Node check passes: fixture yields `["TODAY", "OVERDUE", "YESTERDAY", …]` in
  the ranked order above (exact labels depend on the fixture dates).
- Load the unpacked extension, add items dated yesterday, today, tomorrow, and
  one unscheduled. TODAY is the top section with the list scrolled to 0.
- Drag a row from TOMORROW onto the TODAY header. It reschedules to today and
  the correct item moves — confirming indices still line up after the resort.
