const WINDOW_HEADER = /^([^:\r\n]+)\s*:\s*$/;
const COMMENT_PREFIX = "//";

/**
 * Serialize windows into the plain-text export format.
 *
 * @param {Array<{name?: string, urls: string[]}>} windows
 * @returns {string}
 */
export function serializeWindows(windows) {
  return (
    windows
      .map((window, index) => {
        const urls = window.urls ?? [];

        if (windows.length === 1) {
          return urls.join("\n");
        }

        const name = window.name?.trim() || `Window ${index + 1}`;

        return `${name}:\n${urls.join("\n")}`;
      })
      .join("\n\n") + "\n"
  );
}

/**
 * Parse the plain-text export format into windows.
 *
 * Rules:
 * - A file without window headers represents one window.
 * - A recognized header starts a new window.
 * - Blank lines and lines beginning with // are ignored.
 * - Invalid URLs are collected instead of silently discarded.
 *
 * @param {string} text
 * @returns {{
 *   windows: Array<{name: string, urls: string[]}>,
 *   invalidLines: Array<{line: number, value: string}>
 * }}
 */
export function parseWindows(text) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");

  const windows = [];
  const invalidLines = [];

  let currentWindow = null;
  let hasHeaders = false;

  function createWindow(name) {
    return { name, urls: [] };
  }

  for (let i = 0; i < lines.length; i++) {
    const value = lines[i].trim();

    if (!value || value.startsWith(COMMENT_PREFIX)) {
      continue;
    }

    const header = value.match(WINDOW_HEADER);

    if (header) {
      hasHeaders = true;
      currentWindow = createWindow(header[1].trim());
      windows.push(currentWindow);
      continue;
    }

    if (!currentWindow) {
      currentWindow = createWindow("Window 1");
      windows.push(currentWindow);
    }

    let url;

    try {
      url = new URL(value);
    } catch {
      invalidLines.push({ line: i + 1, value });
      continue;
    }

    if (!["http:", "https:", "ftp:", "file:"].includes(url.protocol)) {
      invalidLines.push({ line: i + 1, value });
      continue;
    }

    currentWindow.urls.push(url.href);
  }

  // Header-based files preserve their window boundaries, including empty
  // windows. Headerless files are treated as a single window.
  if (!hasHeaders && windows.length === 0) {
    windows.push(createWindow("Window 1"));
  }

  return { windows, invalidLines };
}
