import { getWindows, selectWindows, toExportWindows } from "../shared/tabs.js";

import { serializeWindows, parseWindows } from "../shared/text_format.js";

import {
  getSnapshots,
  saveSnapshot,
  renameSnapshot,
  deleteSnapshot,
} from "../shared/storage.js";

import { restoreSnapshot } from "../shared/snapshot.js";

const api = globalThis.browser ?? globalThis.chrome;

const $ = (selector) => document.querySelector(selector);

const elements = {
  scopeSelector: $("#scope-selector"),
  windowList: $("#window-list"),
  selectionSummary: $("#selection-summary-text"),
  exportButton: $("#export-button"),
  saveButton: $("#save-button"),
  refreshButton: $("#refresh-button"),
  snapshotList: $("#snapshot-list"),
  snapshotCount: $("#snapshot-count"),
  importFile: $("#import-file"),
  importPreview: $("#import-preview"),
  importPreviewSummary: $("#import-preview-summary"),
  importErrors: $("#import-errors"),
  restoreImportButton: $("#restore-import-button"),
  cancelImportButton: $("#cancel-import-button"),
  statusText: $("#status-text"),
};

let scope = "current_window";
let windows = [];
let selectedWindowIds = new Set();
let importData = null;
let busy = false;

/**
 * Set the footer status message.
 */
function setStatus(message) {
  elements.statusText.textContent = message;
}

/**
 * Run an action while preventing duplicate clicks.
 */
async function runAction(action, successMessage) {
  if (busy) return;

  busy = true;
  setButtonsDisabled(true);

  try {
    await action();

    if (successMessage) {
      setStatus(successMessage);
    }
  } catch (error) {
    console.error("Tab Vault:", error);

    setStatus(error instanceof Error ? error.message : "Something went wrong.");
  } finally {
    busy = false;
    setButtonsDisabled(false);
    updateSelectionSummary();
  }
}

function setButtonsDisabled(disabled) {
  elements.refreshButton.disabled = disabled;

  updateSelectionSummary();

  // Keep the import confirmation disabled unless there is
  // valid import data and the application is idle.
  elements.restoreImportButton.disabled =
    disabled ||
    !importData ||
    importData.windows.every((window) => window.urls.length === 0);
}

/**
 * Return the currently selected browser windows.
 */
function getSelectedWindows() {
  if (scope === "current_window") {
    const current = windows.find((window) => window.focused);
    return current ? [current] : [];
  }

  if (scope === "all_windows") {
    return windows;
  }

  return windows.filter((window) => selectedWindowIds.has(window.id));
}

/**
 * Render the export scope controls.
 */
function renderScope() {
  for (const button of elements.scopeSelector.querySelectorAll(
    "[data-scope]",
  )) {
    const active = button.dataset.scope === scope;

    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }

  elements.windowList.hidden = scope !== "select_windows";
}

/**
 * Build a window selection row using DOM APIs.
 */
function createWindowRow(window) {
  const row = document.createElement("label");
  row.className = "window-option";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = selectedWindowIds.has(window.id);
  checkbox.setAttribute(
    "aria-label",
    `Select window with ${window.tabs.length} tabs`,
  );

  const content = document.createElement("span");
  content.className = "window-option-content";

  const title = document.createElement("span");
  title.className = "window-option-title";

  const activeTab = window.tabs.find((tab) => tab.active);
  title.textContent = activeTab?.title || "Untitled window";

  const meta = document.createElement("span");
  meta.className = "window-option-meta";
  meta.textContent = `${window.tabs.length} tab${window.tabs.length === 1 ? "" : "s"}`;

  content.append(title, meta);
  row.append(checkbox, content);

  if (window.focused) {
    const badge = document.createElement("span");
    badge.className = "window-active-badge";
    badge.textContent = "Active";
    row.append(badge);
  }

  row.classList.toggle("selected", selectedWindowIds.has(window.id));

  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      selectedWindowIds.add(window.id);
    } else {
      selectedWindowIds.delete(window.id);
    }

    row.classList.toggle("selected", checkbox.checked);
    updateSelectionSummary();
  });

  return row;
}

/**
 * Render all browser windows in the selection list.
 */
function renderWindows() {
  const fragment = document.createDocumentFragment();

  for (const window of windows) {
    fragment.append(createWindowRow(window));
  }

  elements.windowList.replaceChildren(fragment);
  renderScope();
  updateSelectionSummary();
}

/**
 * Update tab counts and button availability.
 */
function updateSelectionSummary() {
  const selected = getSelectedWindows();

  const tabCount = selected.reduce(
    (total, window) => total + window.tabs.length,
    0,
  );

  const windowCount = selected.length;

  elements.selectionSummary.textContent =
    `${windowCount} window${windowCount === 1 ? "" : "s"} · ` +
    `${tabCount} tab${tabCount === 1 ? "" : "s"}`;

  const canExport = windowCount > 0 && !busy;

  elements.exportButton.disabled = !canExport;
  elements.saveButton.disabled = !canExport;

  elements.restoreImportButton.disabled =
    busy ||
    !importData ||
    !importData.windows.some((window) => window.urls.length > 0);
}

/**
 * Refresh browser window data.
 */
async function refreshWindows() {
  windows = await getWindows();

  const existingIds = new Set(windows.map((window) => window.id));

  selectedWindowIds = new Set(
    [...selectedWindowIds].filter((id) => existingIds.has(id)),
  );

  renderWindows();
}

/**
 * Convert selected browser windows to snapshot/export data.
 */
function getExportData() {
  const selected = getSelectedWindows();

  if (selected.length === 0) {
    throw new Error("Select at least one browser window.");
  }

  return toExportWindows(selected);
}

/**
 * Trigger a TXT file download.
 */
async function downloadText(filename, text) {
  const dataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;

  let downloaded = false;

  if (api?.downloads?.download) {
    try {
      await api.downloads.download({
        url: dataUrl,
        filename,
        conflictAction: "uniquify",
      });
      downloaded = true;
    } catch (err) {
      console.warn("api.downloads.download failed, trying DOM fallback:", err);
    }
  }

  if (!downloaded) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => link.remove(), 200);
  }
}

/**
 * Export the selected windows to TXT.
 */
async function exportSelectedWindows() {
  const exportWindows = getExportData();
  const text = serializeWindows(exportWindows);

  const filename = `tab-vault-${new Date().toISOString().slice(0, 10)}.txt`;

  await downloadText(filename, text);

  setStatus(`Exported ${exportWindows.length} window(s).`);
}

/**
 * Save the selected windows as a local snapshot.
 */
async function saveSelectedWindows() {
  const exportWindows = getExportData();

  const name = prompt(
    "Name this snapshot:",
    `Session ${new Date().toLocaleDateString()}`,
  );

  if (name === null) {
    setStatus("Save cancelled.");
    return;
  }

  const selected = getSelectedWindows();

  await saveSnapshot(name, selected);

  await renderSnapshots();

  setStatus(`Saved ${exportWindows.length} window(s).`);
}

/**
 * Create a button with a text label and optional CSS class.
 */
function createButton(label, className, handler, title = label) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.title = title;

  button.addEventListener("click", () => {
    void runAction(handler);
  });

  return button;
}

/**
 * Format a timestamp for the snapshot list.
 */
function formatDate(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Render saved snapshots.
 */
async function renderSnapshots() {
  const snapshots = await getSnapshots();
  const fragment = document.createDocumentFragment();

  elements.snapshotCount.textContent = String(snapshots.length);

  if (snapshots.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const icon = document.createElement("span");
    icon.className = "empty-icon";
    icon.textContent = "▤";
    icon.setAttribute("aria-hidden", "true");

    const heading = document.createElement("p");
    heading.textContent = "No snapshots yet";

    const description = document.createElement("span");
    description.textContent = "Save your current tabs to get started.";

    empty.append(icon, heading, description);
    fragment.append(empty);
  }

  for (const snapshot of snapshots) {
    fragment.append(createSnapshotCard(snapshot));
  }

  elements.snapshotList.replaceChildren(fragment);
}

/**
 * Create one saved snapshot card.
 */
function createSnapshotCard(snapshot) {
  const card = document.createElement("article");
  card.className = "snapshot-card";

  const main = document.createElement("div");
  main.className = "snapshot-main";

  const icon = document.createElement("div");
  icon.className = "snapshot-icon";
  icon.textContent = "▤";
  icon.setAttribute("aria-hidden", "true");

  const info = document.createElement("div");
  info.className = "snapshot-info";

  const name = document.createElement("div");
  name.className = "snapshot-name";
  name.textContent = snapshot.name || "Untitled snapshot";

  const windowCount = snapshot.windows?.length ?? 0;

  const tabCount = (snapshot.windows ?? []).reduce(
    (total, window) => total + (window.tabs?.length ?? 0),
    0,
  );

  const meta = document.createElement("div");
  meta.className = "snapshot-meta";
  meta.textContent =
    `${windowCount} window${windowCount === 1 ? "" : "s"} · ` +
    `${tabCount} tab${tabCount === 1 ? "" : "s"}`;

  const date = document.createElement("div");
  date.className = "snapshot-date";
  date.textContent = formatDate(snapshot.createdAt);

  info.append(name, meta, date);
  main.append(icon, info);

  const actions = document.createElement("div");
  actions.className = "snapshot-actions";

  const restoreButton = createButton(
    "Restore windows",
    "button button-primary",
    async () => {
      await restoreSnapshot(snapshot);
      setStatus(`Restored "${snapshot.name}".`);
    },
  );

  const exportButton = createButton(
    "↓",
    "icon-button",
    async () => {
      const exportWindows = (snapshot.windows ?? []).map((window, index) => ({
        name: window.name || `Window ${index + 1}`,
        urls: (window.tabs ?? []).map((tab) => tab.url),
      }));

      await downloadText(
        `tab-vault-${safeFilename(snapshot.name)}.txt`,
        serializeWindows(exportWindows),
      );

      setStatus("Snapshot exported.");
    },
    "Export snapshot as TXT",
  );

  const menu = createButton(
    "⋯",
    "icon-button",
    async () => {
      const action = prompt(
        `Snapshot: ${snapshot.name}\n\n` + "Type R to rename or D to delete.",
      );

      if (action === null) return;

      if (action.trim().toLowerCase() === "r") {
        const newName = prompt("New snapshot name:", snapshot.name);

        if (newName === null) return;

        await renameSnapshot(snapshot.id, newName);
        await renderSnapshots();
        setStatus("Snapshot renamed.");
      } else if (action.trim().toLowerCase() === "d") {
        if (!confirm(`Delete "${snapshot.name}"?`)) return;

        await deleteSnapshot(snapshot.id);
        await renderSnapshots();
        setStatus("Snapshot deleted.");
      } else {
        setStatus("No action taken.");
      }
    },
    "Rename or delete snapshot",
  );

  actions.append(restoreButton, exportButton, menu);
  card.append(main, actions);

  return card;
}

/**
 * Convert a name to a safe download filename.
 */
function safeFilename(value) {
  return (
    (value || "snapshot")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
      .trim()
      .slice(0, 80) || "snapshot"
  );
}

/**
 * Show a preview of the selected TXT file.
 */
async function previewImport(file) {
  if (!file) return;

  const text = await file.text();
  const parsed = parseWindows(text);

  importData = {
    windows: parsed.windows,
    invalidLines: parsed.invalidLines,
    filename: file.name,
  };

  elements.importPreview.hidden = false;

  const windowCount = parsed.windows.length;
  const tabCount = parsed.windows.reduce(
    (total, window) => total + window.urls.length,
    0,
  );

  elements.importPreviewSummary.textContent =
    `${file.name}: ${windowCount} window(s), ` + `${tabCount} valid URL(s).`;

  const errorFragment = document.createDocumentFragment();

  for (const item of parsed.invalidLines) {
    const li = document.createElement("li");
    li.textContent = `Line ${item.line}: ${item.value}`;
    errorFragment.append(li);
  }

  elements.importErrors.replaceChildren(errorFragment);

  if (parsed.invalidLines.length > 0) {
    const notice = document.createElement("li");
    notice.textContent = "Invalid lines will be skipped if you continue.";
    errorFragment.append(notice);
  }

  elements.importErrors.replaceChildren(errorFragment);

  updateSelectionSummary();

  setStatus(
    parsed.invalidLines.length > 0
      ? "Import preview has invalid lines."
      : "Import preview ready.",
  );
}

/**
 * Open imported windows after user confirmation.
 */
async function restoreImportedWindows() {
  if (!importData) {
    throw new Error("Choose a TXT file first.");
  }

  const windowsToRestore = importData.windows.filter(
    (window) => window.urls.length > 0,
  );

  if (windowsToRestore.length === 0) {
    throw new Error("The file contains no valid URLs.");
  }

  if (
    !confirm(
      `Open ${windowsToRestore.length} new window(s) ` +
        `containing ${windowsToRestore.reduce(
          (sum, window) => sum + window.urls.length,
          0,
        )} URL(s)?`,
    )
  ) {
    return;
  }

  const snapshot = {
    name: importData.filename,
    windows: windowsToRestore.map((window) => ({
      name: window.name,
      tabs: window.urls.map((url) => ({
        url,
        active: false,
        pinned: false,
      })),
    })),
  };

  await restoreSnapshot(snapshot);

  importData = null;
  elements.importFile.value = "";
  elements.importPreview.hidden = true;

  setStatus("Imported windows opened.");
}

/**
 * Clear the import preview.
 */
function cancelImport() {
  importData = null;
  elements.importFile.value = "";
  elements.importPreview.hidden = true;
  elements.importPreviewSummary.textContent = "";
  elements.importErrors.replaceChildren();
  updateSelectionSummary();
  setStatus("Import cancelled.");
}

/**
 * Attach UI event handlers.
 */
function bindEvents() {
  elements.scopeSelector.addEventListener("click", (event) => {
    const button = event.target.closest("[data-scope]");

    if (!button) return;

    scope = button.dataset.scope;
    renderWindows();
  });

  elements.refreshButton.addEventListener("click", () => {
    void runAction(refreshWindows, "Windows refreshed.");
  });

  elements.exportButton.addEventListener("click", () => {
    void runAction(exportSelectedWindows);
  });

  elements.saveButton.addEventListener("click", () => {
    void runAction(saveSelectedWindows);
  });

  elements.importFile.addEventListener("change", () => {
    const file = elements.importFile.files?.[0];

    void runAction(async () => previewImport(file));
  });

  elements.restoreImportButton.addEventListener("click", () => {
    void runAction(restoreImportedWindows);
  });

  elements.cancelImportButton.addEventListener("click", cancelImport);
}

/**
 * Initialize the popup.
 */
async function init() {
  bindEvents();

  try {
    await Promise.all([refreshWindows(), renderSnapshots()]);

    setStatus("Ready.");
  } catch (error) {
    console.error("Tab Vault initialization failed:", error);
    setStatus("Unable to load browser data.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void init());
} else {
  void init();
}
