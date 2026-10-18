const api = globalThis.browser ?? globalThis.chrome;

/**
 * Restore a snapshot by opening each saved window separately.
 *
 * @param {{
 *   id?: string,
 *   name?: string,
 *   windows: Array<{
 *     name?: string,
 *     tabs: Array<{
 *       url: string,
 *       active?: boolean,
 *       pinned?: boolean
 *     }>
 *   }>
 * }} snapshot
 *
 * @returns {Promise<Array<{id: number, name: string}>>}
 */
export async function restoreSnapshot(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.windows)) {
        throw new TypeError("Invalid snapshot.");
    }

    const restoredWindows = [];

    for (const savedWindow of snapshot.windows) {
        const tabs = (savedWindow.tabs ?? [])
            .filter(tab => isRestorableUrl(tab.url));

        // Browser windows must have at least one tab.
        const urls = tabs.length > 0
            ? tabs.map(tab => tab.url)
            : ["about:blank"];

        const activeIndex = tabs.length > 0
            ? Math.max(0, tabs.findIndex(tab => tab.active))
            : 0;

        const createdWindow = await api.windows.create({
            url: urls,
            focused: false,
        });

        if (createdWindow.id == null) {
            throw new Error("The browser did not return a window ID.");
        }

        const createdTabs = (createdWindow.tabs ?? [])
            .slice()
            .sort((a, b) => a.index - b.index);

        // Restore pinned state after the browser creates the tabs.
        for (let i = 0; i < tabs.length; i++) {
            if (tabs[i].pinned && createdTabs[i]?.id != null) {
                await api.tabs.update(createdTabs[i].id, {
                    pinned: true,
                });
            }
        }

        // Select the previously active tab, if one was recorded.
        if (createdTabs[activeIndex]?.id != null) {
            await api.tabs.update(createdTabs[activeIndex].id, {
                active: true,
            });
        }

        restoredWindows.push({
            id: createdWindow.id,
            name: savedWindow.name || "Untitled window",
        });
    }

    return restoredWindows;
}

/**
 * Determine whether a URL can reasonably be restored.
 *
 * This is a basic validation check, not a guarantee that the browser
 * will permit navigation to the URL.
 *
 * @param {string} value
 * @returns {boolean}
 */
function isRestorableUrl(value) {
    if (typeof value !== "string" || !value.trim()) {
        return false;
    }

    try {
        const url = new URL(value);

        return [
            "http:",
            "https:",
            "ftp:",
            "file:",
            "about:",
        ].includes(url.protocol);
    } catch {
        return false;
    }
}