# Plan: Today-First Ordering, Wide Mode, a Settings Panel with Scheduled HIGH Reminders, and Priority Reordering

## Goal

Five changes to the popup checklist, in increasing order of blast radius: put
TODAY at the top of the list so the day you care about needs no scrolling; let
the popup widen so long task text is fully readable; introduce a settings panel
as the home for preferences that are not part of the list itself; and add a
scheduled reminder that surfaces only HIGH-priority items in a centered window.
The fourth of these is the only one that changes what the extension *is* — it adds
a background service worker and a second HTML page, so the extension keeps
running when the popup is closed. A fifth, smaller change then resorts the list
HIGH → MEDIUM → LOW whenever a task's priority is changed.

## Scope

**In scope**

- Reordering day groups so TODAY renders first (`groupByDay`).
- A width mode that expands the popup and lets task text wrap to full length.
- A settings panel, persisted in state, hosting the theme switch and the width
  switch.
- A daily scheduled reminder window listing only `PRIORITY.HIGH`, not-done items.
- Resorting the list HIGH → MEDIUM → LOW when a task's priority changes.
- Splitting the finished work into separately reviewable commits.

**Out of scope**

- Any change to the drag-and-drop contract. `drag-drop.js` addresses items by
  index into `state.items`, which neither group ordering nor the priority resort
  touches.
- Making priority order an *invariant* of the list. The resort fires when a
  priority changes; manual drag order is otherwise preserved.
- Sorting on add, or sinking done tasks to the bottom of their group. Both are
  named in Open questions.
- Pre-existing dead code: `debounce()` and `formatDate()` in `utils.js`, the
  broken `.priority-label` block in `popup.css` (typo'd `solidr`, `12rem`), the
  dead `.flag` button in `popup.html` (it carries `title="Set priority"` but is
  never queried in any JS file), and the stale `INSTALL.md`. These are named in
  Open questions, not changed.
- Notifications via `chrome.notifications`, a second reminder per day, snooze,
  per-item reminders, or reminders for non-HIGH priorities.
- A storage schema version bump. `normalizeState()` already applies defaults to
  anything it reads, so new fields land on old data without migration.

## Architecture / Design decisions

**Group order is a pure function, so that is where the change goes.**
`groupByDay()` currently sorts ascending with unscheduled last, which is exactly
why OVERDUE sits above TODAY. The new order is TODAY → OVERDUE (most recent
first) → UPCOMING (soonest first) → UNSCHEDULED. This keeps `utils.js` DOM-free
and keeps the feature verifiable in plain Node. **No auto-scrolling.** Scrolling
the list on open would fight the sticky group headers and leave items rendered
above the viewport that the user never asked to hide; reordering puts TODAY where
the eye already is.

**Width is a mode, not a drag handle.** Chrome sizes a popup from its content up
to 800×600 and gives the user no resize affordance, so "expand the width" has to
be the page asking for more room. A `data-width="wide"` attribute on `<html>`
drives `body { width }` from CSS, mirroring how `data-theme` already works. Wide
mode also switches `.text` from single-line ellipsis to wrapping, since extra
width alone still truncates a long enough task. `.row` uses `min-height`, not
`height`, so a wrapped row grows correctly with no layout change needed.

**Settings live in state under one key.** `{ items, theme }` becomes
`{ items, theme, settings }`. `theme` stays a top-level field rather than moving
into `settings` — moving it would orphan every existing user's saved theme for no
functional gain, and `normalizeState()` would have to carry a migration branch
forever. `settings` holds only genuinely new preferences: `width` and `reminder`.

**The reminder needs a second runtime.** `popup.html` exists only while the
toolbar popup is open, so nothing in the current codebase can fire on a
schedule. The reminder is therefore:

- `background.js` — an MV3 service worker that owns a `chrome.alarms` alarm and
  reads state from `chrome.storage.local`.
- `reminder.html` / `reminder.js` / shared `popup.css` — a standalone page opened
  with `chrome.windows.create({ type: "popup" })`, positioned centered using the
  focused window's bounds.
- `manifest.json` gains `"alarms"` permission and a `background.service_worker`
  entry.

`chrome.windows.create` is chosen over `chrome.action.openPopup()` deliberately:
`openPopup()` has a history of being policy-gated and requires browser focus,
whereas creating a centered popup window is stable, literally matches "a dialog
in the middle", and needs no extra permission beyond `alarms`.

**The priority resort needs no per-group logic.** `groupByDay()` orders the
*sections* by day and renders each section's items in array order, so array order
is only ever observable *within* a section. One stable sort of the flat array
therefore leaves every group internally priority-ordered, with equal-priority
items keeping their relative order — verified against the real `groupByDay` before
planning it. The rank comes from `PRIORITY_ORDER` rather than the raw constants, so
list order and menu order cannot drift.

**The reminder page is read-mostly.** It lists HIGH items and lets you tick them
done — nothing else. It shares `utils.js` for load/save and `popup.css` for
tokens, but it does **not** import `popup.js`; `popup.js` reaches for
`document.getElementById` at module top level and would throw on a page without
those ids.

**Service-worker writes and popup writes can race.** `loadState()` replaces
`state` wholesale (already a documented trap in CLAUDE.md), so if the reminder
window ticks an item while the popup is open, the popup's next save wins and
discards it. Mitigation is scoped to a single `chrome.storage.onChanged`
listener in `popup.js` that re-reads and re-renders — not a general sync layer.

## Phases

| Phase | File | What it delivers |
|-------|------|-----------------|
| 1 | `plan-1-today-first-group-order.md` | TODAY renders at the top of the list; `groupByDay` resorted, no DOM change |
| 2 | `plan-2-settings-state-and-panel.md` | `settings` in state + a settings panel; the existing theme switch moves into it |
| 3 | `plan-3-wide-mode-full-text.md` | A width switch in settings that widens the popup and wraps task text |
| 4 | `plan-4-scheduled-high-priority-reminder.md` | Service worker, `chrome.alarms`, and a centered reminder window listing HIGH items |
| 5 | `plan-6-reorder-by-priority-on-change.md` | Changing a task's priority resorts its day HIGH → MEDIUM → LOW |
| 6 | `plan-5-split-into-reviewable-commits.md` | The work split into one self-contained commit per phase |

Filename note: `plan-5-…` keeps its name because it is already committed and
referenced elsewhere; it now runs last, after `plan-6-…`.

## Success criteria

- With items dated yesterday, today, and tomorrow, plus one unscheduled, the
  rendered section order is TODAY, OVERDUE, UPCOMING, UNSCHEDULED, and the TODAY
  header is visible at `listEl.scrollTop === 0` without any programmatic scroll.
- A `groupByDay` unit check run in plain Node (no jsdom) asserts that order.
- Toggling wide mode changes `document.documentElement.dataset.width`, the
  rendered `body` width changes, and a 200-character task is fully readable with
  no `text-overflow: ellipsis` applied.
- Width and theme both survive closing and reopening the popup.
- `normalizeState(null)`, `normalizeState({items: []})`, and a state object saved
  by the *current* released version all return a usable state with complete
  `settings` defaults and no thrown error.
- With the reminder enabled at a time one minute out, a centered popup window
  appears listing exactly the not-done HIGH items and nothing else; with it
  disabled, no alarm exists (`chrome.alarms.getAll()` returns none).
- Ticking an item in the reminder window is reflected in the popup on its next
  open.
- With a day holding LOW, MEDIUM and HIGH tasks, changing the last one to HIGH
  moves *that* row to the top of its group, leaves every other task's `updatedAt`
  untouched, and leaves the `×` and checkbox on every row still addressing the
  task they are drawn beside.
- A task dragged out of priority order stays there across a popup reopen — the
  resort fires on a priority change, not on render.
- `git log --oneline` shows one commit per phase, each one building and loading
  in `chrome://extensions` on its own, and no commit contains a change unrelated
  to its phase.

## Open questions

1. **Where do OVERDUE items go?** The plan puts them directly below TODAY, on
   the reasoning that overdue work is still work you must act on now. The
   alternative is sinking them below UPCOMING to keep the list forward-looking.
   Decide before Phase 1 — it is one comparator either way.
2. **Should wide mode be the only mode?** If long text is always a problem, the
   simpler change is to widen the popup permanently and delete the switch
   entirely — less code, one less setting, no state field. The two-mode design is
   planned because you asked for it as a setting, but the one-mode version is
   genuinely better if you would never switch back.
3. **What time does the reminder fire, and how often?** Planned as a single
   daily `HH:MM` the user picks. An interval ("every 4 hours") is a different UI
   and a different alarm setup.
4. **What happens when there are no HIGH items at reminder time?** Planned: the
   window does not open at all, since an empty reminder is pure interruption.
5. **Should the resort be an invariant instead of an event?** Planned as an effect
   of changing a priority, which is what you asked for and which leaves
   drag-to-reorder working. Sorting inside `render()` instead would keep the list
   permanently priority-ordered, but would make dragging a row within a day
   pointless — the next render would discard it. The two are mutually exclusive.
6. **Should adding `!urgent` sort too?** `parseDraft()` is a separate path that
   pushes new items onto the end, so a new HIGH task lands at the bottom of today
   while an existing task promoted to HIGH jumps to the top. Not planned, because
   adding is not updating — but it will look like a bug.
7. **Should done tasks sink?** They sort purely by priority, so a completed HIGH
   task still outranks an outstanding LOW one. Adding `done` as the first sort key
   is a two-line change if you want it.
8. **"Ignore the messy or unnecessary code"** is read as *keep unrelated cleanup
   out of the review commits*, matching the surgical-changes rule. If you meant
   the opposite — clean it up as part of this work — the `.priority-label` CSS
   block is non-functional (`1px solidr`, `font-size: 12rem`) and
   `debounce()`/`formatDate()` are exported but unused. Say so and they become a
   sixth, cleanup-only commit rather than being left alone.
