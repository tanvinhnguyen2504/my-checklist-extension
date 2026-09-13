# Checklist

A quiet todo checklist that lives in your browser toolbar. Tasks are grouped by
the day you assign them, so you can see what belongs to today at a glance.

Offline, no account, no network requests. Everything is stored locally in your
own browser.

---

## What you need

- Google Chrome, Microsoft Edge, Brave, Arc, or Firefox
- A copy of this folder on your computer

There is **no build step** and nothing to install from npm. The folder you
download is the extension.

---

## Step 1 — Get the files

Either clone the repository:

```bash
git clone <repository-url>
cd my-todo-list-ext
```

…or download the ZIP from the repository page and unzip it somewhere permanent.

> **Pick a permanent location.** The browser loads the extension from this
> folder every time it starts. If you move it to the Trash or rename it later,
> the extension stops working.

Confirm you can see `manifest.json` in the folder:

```bash
ls manifest.json
```

If that prints `manifest.json`, you are in the right place. This is the folder
you will point the browser at in the next step.

---

## Step 2 — Load it into your browser

### Chrome, Edge, Brave, or Arc

1. Open a new tab and go to `chrome://extensions`
   (on Edge use `edge://extensions`).
2. Turn on **Developer mode** using the toggle in the top-right corner.
   Three new buttons appear.
3. Click **Load unpacked**.
4. In the file picker, select the folder from Step 1 — the one containing
   `manifest.json`. Select the *folder itself*, not a file inside it.
5. **Checklist** now appears in your extensions list.

### Firefox

1. Open a new tab and go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select the `manifest.json` file from the folder in Step 1.

> Firefox unloads temporary add-ons when you quit the browser. You will need to
> repeat these three steps each time you restart Firefox.

---

## Step 3 — Pin it to your toolbar

By default the icon is hidden in the extensions menu.

1. Click the puzzle-piece **Extensions** icon in the toolbar.
2. Find **Checklist** in the list.
3. Click the pin icon next to it.

The Checklist icon is now visible in your toolbar. Click it to open the popup.

---

## Step 4 — Check that it works

1. Click the Checklist icon.
2. Type `buy milk` in the field at the bottom and press **Enter**.
3. The item appears under the **TODAY** heading.
4. Close the popup and open it again — the item is still there.

If all four happen, the installation is complete.

---

## Using it

### Adding tasks

Type in the field at the bottom and press **Enter**.

Two shortcuts work while typing:

| You type | You get |
| --- | --- |
| `pay rent` | A normal task, due today |
| `!pay rent` | A **high priority** task |
| `pay rent @today` | A task assigned to today |
| `pay rent @tomorrow` | A task assigned to tomorrow |
| `pay rent @12/09` | A task assigned to 12 September |
| `!pay rent @12/09` | High priority, assigned to 12 September |

Dates are written day-first: `@12/09` is 12 September, not 9 December. You can
also write the year: `@12/09/2026`.

### Days

New tasks are assigned to **today** unless you type an `@day` token. Tasks are
grouped under the day they are assigned to, with **TODAY** first so it needs no
scrolling, then anything **OVERDUE**, then what is coming up, then tasks with no
day at all.

To move a task to a different day, drag it onto that day's heading.

### Everyday actions

| Action | How |
| --- | --- |
| Tick a task off | Click the checkbox (the task's text is for editing instead) |
| Rename a task | Double-click its text, then Enter to save (Escape cancels) |
| Set priority | Click the priority pill on the row, then pick a level. The day resorts HIGH → MEDIUM → LOW |
| Reorder tasks | Drag a row up or down |
| Move to another day | Drag a row onto that day's heading |
| Delete one task | Hover the row and click the `×` |
| Tick everything off | **✓ ALL** in the header |
| Delete everything | **CLEAR** in the header, then click again to confirm |
| Open settings | The **⚙** chip in the header |
| Switch light/dark | **Dark mode** in settings |
| Read long task text | **Wide mode** in settings widens the popup and wraps the text |
| Get a daily nudge | **Daily reminder** in settings, plus the time to fire it |

### Daily reminder

With **Daily reminder** switched on, a small window opens in the middle of your
screen at the time you chose, listing only the tasks flagged **HIGH** that are
still outstanding. Tick them off there or press **Escape** to dismiss it.

If nothing high priority is outstanding at that time, no window opens.

---

## Updating after the code changes

If you pull new commits, the browser does not pick them up on its own:

1. Go to `chrome://extensions`.
2. Find **Checklist** and click the circular **reload** arrow on its card.

In Firefox, click **Reload** on the add-on in `about:debugging`.

---

## Removing it

Go to `chrome://extensions` and click **Remove** on the Checklist card.
Your saved tasks are deleted along with it.

---

## Troubleshooting

**"Manifest file is missing or unreadable"**
You selected the wrong folder. Go back to Step 2 and pick the folder that
directly contains `manifest.json`, not its parent and not a subfolder.

**The icon is not in my toolbar**
It is installed but not pinned. See Step 3.

**My tasks disappeared**
Tasks are stored per browser profile. A different profile, or a different
browser, has its own separate list. Removing and re-adding the extension also
clears them.

**Nothing happens when I click the icon**
Open `chrome://extensions`, find Checklist, and click **Errors** or the
**service worker** link to see what failed. This usually means the folder was
edited while loaded — click the reload arrow.

**Firefox forgot the extension**
Expected. Temporary add-ons do not survive a restart; repeat Step 2.

---

## Privacy

The extension requests two permissions: `storage`, and `alarms` for the daily
reminder. It has no host permissions and makes no network requests, so your tasks
never leave your machine.

---

## Project layout

| File | What it holds |
| --- | --- |
| `manifest.json` | Manifest V3 definition, `storage` and `alarms` permissions |
| `popup.html` | Popup markup, row and group templates, settings panel |
| `popup.css` | Theme tokens, light/dark via `data-theme` |
| `popup.js` | DOM rendering and event wiring |
| `settings.js` | The settings panel and its controls |
| `utils.js` | Storage, date and grouping logic, with no DOM access |
| `background.js` | Service worker: owns the reminder alarm |
| `reminder.html`, `reminder.js` | The daily reminder window |
| `icons/` | Toolbar icons at 16 / 32 / 48 / 128 px |
