# Tab Crate 📦

> **Local-First Tab Manager for Modern Browsers**  
> Export, snapshot, and restore browser tabs across multiple windows without third-party tracking or cloud dependencies.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V2 / V3](https://img.shields.io/badge/Manifest-V2%20%7C%20V3-orange.svg)](#browser-support)
[![Firefox & Zen Compatible](https://img.shields.io/badge/Firefox%20%26%20Zen-Compatible-green.svg)](#firefox--zen-browser)
[![Chrome Compatible](https://img.shields.io/badge/Chrome-Compatible-yellow.svg)](#google-chrome--chromium-browsers)

---

## 📺 Demo Video

<!-- DEMO VIDEO LINK PLACEHOLDER -->
<!-- Replace the link below with your actual demo video URL (e.g., YouTube, Loom, or raw mp4 link) -->

[![Watch the Demo Video](https://img.shields.io/badge/Demo_Video-Watch_Preview-red?style=for-the-badge&logo=youtube)](YOUR_DEMO_VIDEO_LINK_HERE)

> *Demo link: [Watch Tab Crate in Action](YOUR_DEMO_VIDEO_LINK_HERE)*

---

## ✨ Features

- ▣ **Flexible Export Scopes**: Export tabs from the **Current Window**, **All Windows**, or select specific individual windows.
- 💾 **Local Snapshots**: Save sessions with custom names and timestamps directly to local browser storage—no accounts or servers required.
- ↻ **Full Restoration**: Restore entire snapshots across multiple windows, preserving active tab focus and pinned tab states.
- 📄 **Clean Plain-Text Format**: Exports and imports tabs using human-readable, edit-friendly plain-text files (`.txt`).
- 🔍 **Import Validation & Preview**: Previews imported window structures and highlights invalid lines or broken URLs before restoring.
- ⚡ **Cross-Browser Architecture**: Native builds for Firefox/Zen Browser (Manifest V2) and Chrome/Chromium (Manifest V3).
- ⌨️ **Keyboard Shortcuts & Tab View**: Open as a popup or in a full dedicated tab via keyboard shortcuts (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>U</kbd>) or right-click context menu.

---

## 🗂️ Project Structure

```text
TabCrate/
├── chrome/                 # Chrome-specific extension bundle (Manifest V3)
│   ├── background.js       # Service worker background script
│   └── manifest.json       # Manifest V3 configuration
├── firefox/                # Firefox / Zen-specific extension bundle (Manifest V2)
│   ├── background.html     # Standards-mode background page container
│   ├── background.js       # Background event handler & shortcut manager
│   └── manifest.json       # Manifest V2 configuration
├── shared/                 # Shared core logic (platform-agnostic)
│   ├── snapshot.js         # Window & tab restoration engine
│   ├── storage.js          # Local storage snapshot CRUD operations
│   ├── tabs.js             # Browser window and tab querying helpers
│   └── text_format.js      # Plain-text serializer and parser
├── ui/                     # Common user interface
│   ├── pop-up.html         # Popup and full tab interface
│   ├── pop-up.js           # UI event controller and DOM renderer
│   └── style.css           # Dark theme design system & layout styling
├── icons/                  # High-resolution PNG and ICO icons
├── scripts/
│   └── build.sh            # Automated multi-browser distribution build script
├── LICENSE                 # MIT License
└── README.md
```

---

## 🚀 Building the Extension

Tab Crate includes an automated build script that packages browser-specific distribution bundles into `dist/`.

### Prerequisites

- A Unix-like terminal environment (Linux, macOS, or WSL / Git Bash on Windows).
- Bash shell (`bash`).

### Build Command

Run the build script from the repository root:

```bash
chmod +x scripts/build.sh
./scripts/build.sh
```

This compiles two output directories:
- `dist/firefox/` — Built extension for **Firefox** and **Zen Browser**.
- `dist/chrome/` — Built extension for **Google Chrome**, **Brave**, **Edge**, etc.

---

## 📥 Installation & Usage

### Firefox & Zen Browser

1. Run the build script (`./scripts/build.sh`).
2. Open **Firefox** or **Zen Browser** and enter `about:debugging` in the address bar.
3. In the left navigation, click **This Firefox** (or **This Zen**).
4. Under *Temporary Extensions*, click **Load Temporary Add-on...**.
5. Select `dist/firefox/manifest.json`.

> **Zen Browser Tip**:  
> In Zen Browser, newly loaded extensions appear inside the URL bar's extensions/settings dropdown menu. To view the popup, right-click **Tab Crate** in the list and select **"Pin to Toolbar"** (or pin to sidebar). You can also press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>U</kbd> to open Tab Crate directly in a full tab.

### Google Chrome & Chromium Browsers

1. Run the build script (`./scripts/build.sh`).
2. Open Chrome and enter `chrome://extensions` in the address bar.
3. Toggle on **Developer mode** in the top-right corner.
4. Click **Load unpacked** in the top-left corner.
5. Select the `dist/chrome` folder.

---

## ⌨️ Shortcuts & Hotkeys (Firefox / Zen)

| Shortcut | Action |
| :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Y</kbd> | Open Tab Crate popup |
| <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>U</kbd> | Open Tab Crate in a full tab |

---

## 📝 TXT Export Format

Tab Crate exports tabs in an intuitive, human-editable format:

### Single Window Export
```text
https://github.com
https://developer.mozilla.org
https://news.ycombinator.com
```

### Multi-Window Export
```text
Window 1:
// urls
https://github.com
https://developer.mozilla.org

Window 2:
// urls
https://news.ycombinator.com
https://wikipedia.org
```

*Blank lines and lines starting with `//` comments are ignored during import.*

---

## 🛡️ Privacy & Security

- **100% Local**: No external telemetry, remote APIs, or cloud servers.
- **Zero Tracking**: Your URLs and browsing habits never leave your local browser storage.
- **Safe Imports**: Strict URL validation prevents loading malicious scripts or invalid protocols.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE) &copy; 2026 Vinayak Gupta.
