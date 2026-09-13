# Phase 5 — Split the Work into Reviewable Commits

## Goal

Land the four features as four self-contained commits on a feature branch, each
reviewable and loadable on its own.

## Tasks

- [ ] Create the feature branch off `main` before any code is written —
      `feature/settings-width-today-reminder`.
- [ ] Commit at the end of each phase, not at the end of the work.
- [ ] Before each commit, `git add -p` and read the diff: every hunk must trace
      to that phase's request.
- [ ] Update `README.md` in the same commit as the feature it documents, not in a
      trailing docs commit.
- [ ] Bump `manifest.json` `version` once, in the final commit.
- [ ] Open the PR with the phase list as its description.

## Implementation notes

**Use commits, not `git stash`.** You asked for "distinct stashes", and the
intent — separable units that are easy to review — is right, but `git stash` is
the wrong tool for it. Stashes are an unnamed LIFO stack with no message, no
diff-against-parent view, nothing to comment on, and nothing GitHub can render;
they are also easy to lose. Commits on a branch give you exactly what you want
and `git rebase -i` to reshape them afterwards. If you genuinely want the changes
*unapplied* and set aside, say so and this becomes four stashes pushed in reverse
order — but review them as commits.

**One commit per phase, in phase order:**

| # | Subject | Touches |
|---|---|---|
| 1 | `feat(list): sort the day groups with today first` | `utils.js` |
| 2 | `feat(settings): add a settings panel and persist its state` | `utils.js`, `popup.html`, `popup.css`, `popup.js`, `settings.js` |
| 3 | `feat(settings): add a wide mode that shows the full task text` | `utils.js`, `popup.css`, `popup.html`, `settings.js` |
| 4 | `feat(reminder): open a daily reminder for high-priority tasks` | `manifest.json`, `background.js`, `reminder.html`, `reminder.js`, `utils.js`, `popup.js`, `popup.css` |
| 5 | `feat(row): reorder the list by priority when one changes` | `utils.js`, `popup.js`, `README.md` |

This matches the existing history's style — `feat(export): …`,
`refactor: …`, `fix(row): …` — so keep the `type(scope): lowercase subject` form.

**Each commit must load.** Before committing, point `chrome://extensions` at the
repo and confirm the popup opens with no console errors. A commit that only works
once the next one lands is not independently reviewable, which is the entire
point of splitting them.

**Keep unrelated cleanup out.** Per the surgical-changes rule, do not fold these
into any feature commit:

- the non-functional `.priority-label` block in `popup.css` (`1px solidr`,
  `font-size: 12rem`)
- the dead `.flag` button in `popup.html`, which carries `title="Set priority"`
  but is never queried in any JS file — and the `README.md` line that documents it
  as the way to set a priority
- the exported-but-unused `debounce()` and `formatDate()` in `utils.js`
- the stale `INSTALL.md`
- the missing `isComposing` guard on the draft input (the suspected Telex
  duplicate-Enter bug)

Each is a real defect and worth its own commit later. Mixing them into a feature
diff is what makes a review slow. If you decide you want them cleaned now, they
go in a single trailing `chore:`/`fix:` commit that touches nothing else — see
Open question 5 in `plan.md`.

**Update `CLAUDE.md` in the commit that invalidates it.** Phase 4 makes "the
repo root *is* the extension, no build step" still true but "`popup.html` loads
`popup.js`" no longer the whole story — there is a service worker and a second
page. The Layout table and the Data model section both need the new files and the
`settings` field. Letting the doc drift is how the existing Loose ends section got
written.

## Verify

- `git log --oneline main..HEAD` shows four commits with the subjects above.
- For each commit: `git checkout <sha>`, load unpacked, open the popup, confirm no
  console error and that the feature that commit claims to add works.
- `git show --stat <sha>` for each: no file outside that phase's Touches column.
- `git diff main..HEAD -- popup.css | grep priority-label` returns nothing,
  confirming no unrelated cleanup leaked in.
- `CLAUDE.md` Layout table lists `settings.js`, `background.js`, `reminder.html`,
  `reminder.js`; the Data model section documents `settings`.
