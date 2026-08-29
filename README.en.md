# Typevet

Extension for browsing and copying your custom descriptions without leaving the current web page.

## Features

- Activation only after the user clicks the typevet icon in the current tab;
- Temporary `activeTab` access with no permanent all-sites permission;
- Draggable floating button on the activated page, with its position saved;
- Control to disable or re-enable the floating button at any time;
- Portuguese and English interface synchronized between the floating panel and manager;
- **Library** as the first panel option, bringing every organ and description together;
- Mouse navigation through categories, organs, and descriptions;
- Instant search inside each organ by description title or content;
- Quick creation of descriptions from the floating panel;
- Preview and one-click copy;
- Favorites and recently used items;
- Category, organ, and description management;
- JSON backup import and export;
- Local browser storage with no external server.

The initial categories are **Abdomen**, **Cervical**, and **Ocular**. Users can create any categories and organs they need, and each organ can contain multiple descriptions.

The bundled texts are samples only. Replace them with descriptions validated by your practice before professional use.

## Install for development

1. Extract the project archive.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `typevet-extension` folder containing `manifest.json`.
6. Open a regular web page and click the typevet icon in the Chrome toolbar. The panel is activated and opened in that tab.

Access is temporary and limited to the tab where the icon was clicked. After reloading the page, closing the tab, or navigating to another website, click the icon again to reactivate typevet. On browser-protected pages, the manager opens instead.

## Use

1. Click the typevet icon to activate and open the panel on the current page.
2. Drag **Descriptions** to the most convenient screen position.
3. Click **New description** in the panel footer to save a text without leaving the page.
4. Use the **PT/EN** control to switch the entire interface. On a new installation, typevet starts in English when Chrome uses English; otherwise it starts in Portuguese.
5. Click **Disable button** to hide the floating button on that page. The panel remains available from the typevet toolbar icon.
6. Use **Manage** for categories, organs, full edits, and backups.
7. Open **Library** to browse every organ, or choose a category directly, then open and copy a description.

The language switch translates the interface and bundled samples. User-created clinical descriptions remain exactly as entered and are never translated automatically.

The panel is injected only after an explicit user action. It cannot run on Chrome internal pages, the Chrome Web Store, or other browser-protected pages.

## Privacy

typevet makes no network requests and stores data with `chrome.storage.local`. Page access is temporary and granted through `activeTab` only after a user click. Uninstalling the extension removes stored data, so keep regular JSON backups. Do not store patient names, document numbers, or other identifying information in descriptions.

## Validate locally

With Node.js installed, run:

```bash
npm test
```
