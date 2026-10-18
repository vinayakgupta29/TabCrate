/**
 * Tab Crate — Firefox background script
 *
 * The popup handles tab export, import, snapshots, and restoration.
 * This script handles extension lifecycle events and tab launcher shortcuts.
 */

const api = globalThis.browser ?? globalThis.chrome;

function openTabCrateTab() {
  const url = api.runtime.getURL("ui/pop-up.html");
  api.tabs.create({ url });
}

api.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    console.info("Tab Crate installed.");
  } else if (reason === "update") {
    console.info("Tab Crate updated.");
  }

  // Add context menu option to open in a tab
  if (api.contextMenus?.create) {
    try {
      api.contextMenus.create({
        id: "open-tab-crate-tab",
        title: "Open Tab Crate in a new tab",
        contexts: ["browser_action"],
      });
    } catch (e) {
      console.warn("Could not register context menu:", e);
    }
  }
});

api.runtime.onStartup.addListener(() => {
  console.info("Tab Crate browser session started.");
});

// Handle context menu clicks
if (api.contextMenus?.onClicked) {
  api.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === "open-tab-crate-tab") {
      openTabCrateTab();
    }
  });
}

// Handle keyboard shortcuts
if (api.commands?.onCommand) {
  api.commands.onCommand.addListener((command) => {
    if (command === "open-tab-crate-tab") {
      openTabCrateTab();
    }
  });
}
