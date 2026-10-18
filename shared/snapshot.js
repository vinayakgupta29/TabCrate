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
        const validTabs = (savedWindow.tabs ?? [])
            .filter(tab => isRestorableUrl(tab.url));

        // Browser windows must have at least one tab.
        const urls = validTabs.length > 0
            ? validTabs.map(tab => tab.url)
            : ["about:blank"];

        const activeIndex = validTabs.length > 0
            ? Math.max(0, validTabs.findIndex(tab => tab.active))
            : 0;

        let createdWindow;

        try {
            createdWindow = await api.windows.create({
                url: urls,
                focused: false,
            });
        } catch (error) {
            console.warn("Batch window creation failed, opening tabs safely:", error);

            // Fallback: create window with initial restorable URL
            const initialUrl = urls[0] && isRestorableUrl(urls[0]) ? urls[0] : "about:blank";
            createdWindow = await api.windows.create({
                url: initialUrl,
                focused: false,
            });

            for (let i = 1; i < urls.length; i++) {
                try {
                    await api.tabs.create({
                        windowId: createdWindow.id,
                        url: urls[i],
                    });
                } catch (tabError) {
                    console.warn(`Skipped unrestorable tab URL (${urls[i]}):`, tabError);
                }
            }
        }

        if (createdWindow.id == null) {
            throw new Error("The browser did not return a window ID.");
        }

        const createdTabs = (createdWindow.tabs ?? [])
            .slice()
            .sort((a, b) => a.index - b.index);

        // Restore pinned state after the browser creates the tabs.
        for (let i = 0; i < validTabs.length; i++) {
            if (validTabs[i].pinned && createdTabs[i]?.id != null) {
                try {
                    await api.tabs.update(createdTabs[i].id, {
                        pinned: true,
                    });
                } catch {
                    // Ignore pinned update error if tab already closed or updated
                }
            }
        }

        // Select the previously active tab, if one was recorded.
        if (createdTabs[activeIndex]?.id != null) {
            try {
                await api.tabs.update(createdTabs[activeIndex].id, {
                    active: true,
                });
            } catch {
                // Ignore tab focus error
            }
        }

        restoredWindows.push({
            id: createdWindow.id,
            name: savedWindow.name || "Untitled window",
        });
    }

    return restoredWindows;
}

/**
 * Determine whether a URL can reasonably and safely be restored.
 *
 * Blocks internal privileged pages (like about:debugging, about:config,
 * chrome://, etc.) which throw "Error: Illegal URL" in WebExtensions.
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isRestorableUrl(value) {
    if (typeof value !== "string" || !value.trim()) {
        return false;
    }

    const trimmed = value.trim();

    // Only about:blank is permitted under about: for extensions
    if (trimmed.toLowerCase() === "about:blank") {
        return true;
    }

    try {
        const url = new URL(trimmed);

        // Allow standard web protocols
        if (url.protocol === "http:" || url.protocol === "https:" || url.protocol === "ftp:") {
            return true;
        }

        if (url.protocol === "about:") {
            return url.pathname === "blank" || url.href === "about:blank";
        }

        return false;
    } catch {
        return false;
    }
}