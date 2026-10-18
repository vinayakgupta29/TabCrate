/**
 * Tab Crate — Chrome background service worker
 *
 * The popup currently performs the extension's main operations.
 * This service worker provides the background entry point for
 * future lifecycle events and extension-wide tasks.
 */

chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "install") {
        console.info("Tab Crate installed.");
    } else if (reason === "update") {
        console.info("Tab Crate updated.");
    }
});

chrome.runtime.onStartup.addListener(() => {
    console.info("Tab Crate browser session started.");
});