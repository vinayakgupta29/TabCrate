const api = globalThis.browser ?? globalThis.chrome;

/**
 * Retrieve browser windows and their tabs.
 *
 * @returns {Promise<Array<{
 *   id: number,
 *   name: string,
 *   focused: boolean,
 *   tabs: Array<{
 *     id: number,
 *     url: string,
 *     title: string,
 *     active: boolean,
 *     pinned: boolean,
 *     index: number
 *   }>
 * }>>}
 */
export async function getWindows() {
    const browserWindows = await api.windows.getAll({
        populate: true,
        windowTypes: ["normal"],
    });

    const windows = [];

    for (const window of browserWindows) {
        if (window.id == null) continue;

        const tabs = (window.tabs ?? [])
            .filter(tab => typeof tab.url === "string" && tab.url.length > 0)
            .sort((a, b) => a.index - b.index)
            .map(tab => ({
                id: tab.id,
                url: tab.url,
                title: tab.title ?? tab.url,
                active: Boolean(tab.active),
                pinned: Boolean(tab.pinned),
                index: tab.index,
            }));

        windows.push({
            id: window.id,
            name: "",
            focused: Boolean(window.focused),
            tabs,
        });
    }

    return windows;
}

/**
 * Select windows according to the requested scope.
 *
 * @param {"current_window" | "all_windows" | "select_windows"} scope
 * @param {number[]} selectedWindowIds
 */
export async function selectWindows(
    scope,
    selectedWindowIds = [],
) {
    const windows = await getWindows();

    switch (scope) {
        case "current_window": {
            const current = windows.find(window => window.focused);

            return current ? [current] : [];
        }

        case "all_windows":
            return windows;

        case "select_windows": {
            const selected = new Set(selectedWindowIds);

            return windows.filter(window => selected.has(window.id));
        }

        default:
            throw new TypeError(`Unknown window scope: ${scope}`);
    }
}

/**
 * Convert selected windows into the TXT export data model.
 *
 * @param {Array<{name?: string, tabs: Array<{url: string}>}>} windows
 */
export function toExportWindows(windows) {
    return windows.map((window, index) => ({
        name: window.name?.trim() || `Window ${index + 1}`,
        urls: window.tabs.map(tab => tab.url),
    }));
}