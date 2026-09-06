# Checklist — install locally

Unpacked Manifest V3 extension. No build step, no accounts, no network. Items live in `chrome.storage.local`.

## Chrome / Edge / Brave / Arc
1. Open `chrome://extensions` (Edge: `edge://extensions`).
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this `extension/` folder.
4. Pin **Checklist** in the toolbar and click it.

## Firefox
1. Open `about:debugging#/runtime/this-firefox`.
2. **Load Temporary Add-on…** → pick `extension/manifest.json`.
   (Temporary: it unloads when Firefox restarts.)

## Using it
- Type in the bottom field, Enter to save.
- Start with `!` to add it as high priority.
- Click a row to check it off; click the colored left edge to cycle priority (high → normal → none).
- Hover a row for the delete `×`.
- The LIGHT / DARK chip in the header toggles theme; first run follows your OS.

## Files
| File | What |
| --- | --- |
| `manifest.json` | MV3 manifest, `storage` permission only |
| `popup.html` | Popup markup + row template |
| `popup.css` | Theme tokens, light/dark via `data-theme` |
| `popup.js` | State, storage, rendering |
| `icons/` | 16 / 32 / 48 / 128 px |
