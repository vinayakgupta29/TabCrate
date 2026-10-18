/**
 * Tab Vault — Chrome background service worker
 *
 * The popup currently performs the extension's main operations.
 * This service worker provides the background entry point for
 * future lifecycle events and extension-wide tasks.
 */

chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "install") {
        console.info("Tab Vault installed.");
    } else if (reason === "update") {
        console.info("Tab Vault updated.");
    }
});

chrome.runtime.onStartup.addListener(() => {
    console.info("Tab Vault browser session started.");
});