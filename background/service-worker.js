import "../shared/defaults.js";

const { STORAGE_KEYS, migrateStoredData } = globalThis.TYPEVET;
const CONTENT_SCRIPT_FILES = [
  "shared/i18n.js",
  "shared/defaults.js",
  "content/content.js"
];
const activatingTabs = new Set();

async function seedStorageIfNeeded() {
  const current = await chrome.storage.local.get(Object.values(STORAGE_KEYS));
  const migrated = migrateStoredData(current);

  if (migrated.didMigrate) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.categories]: migrated.categories,
      [STORAGE_KEYS.organs]: migrated.organs,
      [STORAGE_KEYS.descriptions]: migrated.descriptions,
      [STORAGE_KEYS.settings]: migrated.settings,
      [STORAGE_KEYS.initialized]: true
    });
  } else if (!current[STORAGE_KEYS.initialized]) {
    await chrome.storage.local.set({ [STORAGE_KEYS.initialized]: true });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  seedStorageIfNeeded().catch(() => undefined);
});

chrome.runtime.onStartup.addListener(() => {
  seedStorageIfNeeded().catch(() => undefined);
});

async function openExistingPanel(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: "TYPEVET_OPEN_PANEL" });
    return response?.handled === true;
  } catch {
    return false;
  }
}

async function injectTypevet(tabId) {
  const cssResponse = await fetch(chrome.runtime.getURL("content/content.css"));
  if (!cssResponse.ok) throw new Error(`css-load-failed:${cssResponse.status}`);
  const cssText = await cssResponse.text();

  await chrome.scripting.executeScript({
    target: { tabId },
    func: (injectedCssText) => {
      globalThis.TYPEVET_BOOTSTRAP = {
        cssText: injectedCssText,
        openPanel: true
      };
    },
    args: [cssText]
  });

  await chrome.scripting.executeScript({
    target: { tabId },
    files: CONTENT_SCRIPT_FILES
  });
}

async function activateTypevet(tab) {
  const tabId = tab?.id;
  if (!tabId) {
    await chrome.runtime.openOptionsPage();
    return;
  }

  if (await openExistingPanel(tabId)) return;
  if (activatingTabs.has(tabId)) return;
  activatingTabs.add(tabId);

  try {
    await injectTypevet(tabId);
  } catch {
    await chrome.runtime.openOptionsPage();
  } finally {
    activatingTabs.delete(tabId);
  }
}

chrome.action.onClicked.addListener((tab) => {
  return activateTypevet(tab);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "SONO_OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
  }
});
