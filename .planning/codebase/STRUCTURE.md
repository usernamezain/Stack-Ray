# Codebase Structure - StackRay

This document outlines the files, paths, and module layout of the StackRay extension.

## 1. Directory Tree

```
c:\Users\SHABBIR TRADERS\Desktop\Chrome Extention\
├── manifest.json            # Extension configuration manifest (Manifest V3)
├── content.js               # Content script injected at document_start
├── inject.js                # Core page-scope interceptor
├── categories.js            # Central technology rules engine & TechDetector
├── README.md                # Project documentation
├── analysis.txt             # HTML competitor landscape study
├── icons/                   # Visual asset directory
│   └── icon.svg             # Extension vector logo
└── popup/                   # Main interface dashboard component
    ├── popup.html           # Document structure with tabs
    ├── popup.js             # Injection manager, renderer and export logic
    └── popup.css            # Stylesheet, colors, badges and metrics grids
```

## 2. File Roles & APIs Used

### `manifest.json`
Specifies extension specifications. Sets popup file path, runtime permissions (`activeTab`, `scripting`), content script match criteria, and makes `inject.js` web-accessible so it can be appended into the page.

### `content.js`
Executes in the Isolated World when pages begin loading (`run_at: document_start`). Appends a `<script>` tag referencing `inject.js` using `chrome.runtime.getURL` and immediately cleans up the node after loading.

### `inject.js`
Monkeypatches `window.fetch` and `console.error` in the Main World. Logs error counts and api descriptors into a global `window._stackXRay_Net` object in the page context.

### `categories.js`
Houses `CATEGORIES` array listing technology signatures. Declares `TechDetector` which handles logic checks over scripts, global keys, DOM matches, text matching and browser API presence, resolving dependency implications.

### `popup/popup.html`
Renders the navigation menu and individual panes for: Tech, Design, SEO, Keywords, Perf, A11y, Net, Leads, and Report download actions.

### `popup/popup.js`
Initializes UI controls, performs active tab discovery, runs script injections in the main/isolated worlds, collects the resulting JSON profiles, queries origin headers via a HEAD request, updates DOM nodes, calculates SEO health scores, and downloads reports in JSON/CSV.

### `popup/popup.css`
A minimalist, high-contrast style guide. Contains custom badges, loading animations, metric meters, and cards modeled after modern aesthetic standards.
