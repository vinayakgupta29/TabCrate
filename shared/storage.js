const api = globalThis.browser ?? globalThis.chrome;

const STORAGE_KEY = "tabCrate.snapshots";

/**
 * Read all saved snapshots.
 *
 * @returns {Promise<Array<object>>}
 */
export async function getSnapshots() {
    const result = await api.storage.local.get(STORAGE_KEY);
    const snapshots = result[STORAGE_KEY];

    return Array.isArray(snapshots) ? snapshots : [];
}

/**
 * Save a snapshot.
 *
 * @param {string} name
 * @param {Array<{
 *   name?: string,
 *   tabs: Array<{
 *     url: string,
 *     active?: boolean,
 *     pinned?: boolean
 *   }>
 * }>} windows
 * @returns {Promise<object>}
 */
export async function saveSnapshot(name, windows) {
    const snapshot = {
        id: crypto.randomUUID(),
        name: name.trim() || "Untitled snapshot",
        createdAt: new Date().toISOString(),
        windows: windows.map((window, index) => ({
            name: window.name?.trim() || `Window ${index + 1}`,
            tabs: window.tabs.map(tab => ({
                url: tab.url,
                active: Boolean(tab.active),
                pinned: Boolean(tab.pinned),
            })),
        })),
    };

    const snapshots = await getSnapshots();
    snapshots.unshift(snapshot);

    await api.storage.local.set({
        [STORAGE_KEY]: snapshots,
    });

    return snapshot;
}

/**
 * Rename an existing snapshot.
 *
 * @param {string} id
 * @param {string} name
 * @returns {Promise<boolean>}
 */
export async function renameSnapshot(id, name) {
    const newName = name.trim();

    if (!newName) {
        throw new TypeError("Snapshot name cannot be empty.");
    }

    const snapshots = await getSnapshots();
    const snapshot = snapshots.find(item => item.id === id);

    if (!snapshot) return false;

    snapshot.name = newName;

    await api.storage.local.set({
        [STORAGE_KEY]: snapshots,
    });

    return true;
}

/**
 * Delete a snapshot by ID.
 *
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteSnapshot(id) {
    const snapshots = await getSnapshots();
    const remaining = snapshots.filter(item => item.id !== id);

    if (remaining.length === snapshots.length) {
        return false;
    }

    await api.storage.local.set({
        [STORAGE_KEY]: remaining,
    });

    return true;
}

/**
 * Find a snapshot by ID.
 *
 * @param {string} id
 * @returns {Promise<object | null>}
 */
export async function getSnapshot(id) {
    const snapshots = await getSnapshots();

    return snapshots.find(item => item.id === id) ?? null;
}