# Phase 1 — Get to a Clean Tree on a Feature Branch

## Goal

Land the work already sitting in the tree, empty the stash, and move onto a
feature branch, so that every file move in Phase 2 renders as a pure rename
rather than a delete-plus-add.

## Tasks

- [ ] Run `git status --short` and confirm the dirty set is exactly:
      `CHANGELOG.md` (modified) and
      `docs/plans/20260929-1148-restructure-src-by-layer/` plus
      `docs/plans/20260927-2105-restructure-src-by-layer/` (added).
- [ ] Create and switch to a feature branch — `chore/restructure-src-by-layer`.
- [ ] Commit `CHANGELOG.md` on its own. It is the reminder-feature changelog
      entry plus a trailing-newline fix, and it belongs to the *previous* piece
      of work, not to this restructure.
- [ ] Commit both plan folders together as a docs commit.
- [ ] Confirm `git stash list` is empty. `stash@{0}` currently holds the
      `20260927-2105` plan folder; once that folder is committed the stash is
      redundant and should be dropped, not left to rot.
- [ ] Confirm `git status --short` prints nothing.

## Implementation notes

**This is not the superseded plan's Phase 1.** That one asked for the four dirty
JS files to be committed; they already were, as `8f2749c` (reminder feature),
`e54feb9` (rename), `1c4b16b` (brace style) and `59ad78d` (comment removal plus
version bump). Those four commits are on `main`. That is done and is not being
revisited — this phase deals with what is dirty *now*.

**Branch from the current `main` tip, not from before those four commits.** They
are legitimate work that is already pushed in part; the restructure goes on top.

**The stash and the plan folder hold the same content.** `stash@{0}` is
`split/7-docs`, created when the working tree was split into focused stashes; its
entire payload is the `20260927-2105` plan folder, which is already applied to
the tree. Committing the tree makes the stash a duplicate. Verify that before
dropping: `git stash show --stat stash@{0}` should list only files under
`docs/plans/20260927-2105-restructure-src-by-layer/`.

**Do not fold any of this into the restructure commits.** A commit that both
changes content and moves files is the one shape of commit that makes a bisect
useless later — you cannot tell whether a regression came from the logic or the
paths.

There is a `refs/split-stash/backup` ref left over from the stash split, holding
a snapshot of the pre-split working tree. It is safe to delete once the stash is
gone (`git update-ref -d refs/split-stash/backup`), but it costs nothing to keep
until the restructure is finished.

## Verify

- `git branch --show-current` prints the feature branch name, not `main`.
- `git status --short` is empty.
- `git stash list` is empty.
- `git log --oneline -3` shows the changelog commit and the docs commit.
- The extension still loads and works: reload it in `chrome://extensions`, open
  the popup, add and tick an item. This is the baseline the rest of the plan must
  not change.
