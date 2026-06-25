# Technology Stack - StackRay Chrome Extension

StackRay is a browser extension developed with modern web standards, operating entirely client-side. Below is a breakdown of the technologies, libraries, and runtime APIs utilized:

## 1. Extension Runtime
- **Chrome Extension APIs (Manifest V3)**:
  - `chrome.tabs`: Used to query the active tab's metadata (`chrome.tabs.query`).
  - `chrome.scripting`: Injects scripts dynamically into active tab pages (`chrome.scripting.executeScript`).
- **Permissions Required**:
  - `activeTab`: Provides temporary host permission to read the active page.
  - `scripting`: Required to execute JavaScript in the context of the active tab.

## 2. Core Frontend (Popup UI)
- **HTML5**: Structured semantic popup document (`popup/popup.html`).
- **Vanilla CSS3**: Styling sheets (`popup/popup.css`) using responsive design grids, flexbox, custom scrollbars, spin animations, and state transitions (e.g. active tabs, tooltips, hover effects).
- **Vanilla JavaScript (ES6+)**: Logic controller (`popup/popup.js`) for DOM manipulation, dynamic HTML rendering, CSV/JSON export generation, and event listeners.
- **Typography**: Google Fonts integration (`Plus Jakarta Sans`) loaded dynamically.

## 3. Technology Detection Engine
- **Centralized Classifier (`categories.js`)**:
  - Employs a categorization index (`CATEGORIES`) classifying technologies into 12 priority areas.
  - Heuristics run checks on DOM selectors, page source patterns (regex), global window properties, and browser APIs.
  - Resolves technology implications (e.g., if `NextJS` is found, `React` and `NodeJS` are automatically implied).

## 4. DOM and Performance Profiling
- **Performance Web Vitals API**:
  - Uses `performance.getEntriesByType("paint")` to fetch First Contentful Paint (FCP).
  - Uses `PerformanceObserver` with `buffered: true` to capture Largest Contentful Paint (LCP) and Cumulative Layout Shift (CLS).
- **DOM Crawler**:
  - Scans elements via `document.querySelectorAll` and retrieves styling configurations using `window.getComputedStyle`.
  - Conducts a structural accessibility audit checking for semantic landmarks, alt attributes, and element labels.

## 5. Security & Network Hooking
- **Monkeypatching / Injected Script**:
  - `content.js` dynamically creates a script tag pointing to `inject.js`.
  - `inject.js` is loaded directly into the main world execution context to intercept `window.fetch` requests and track `console.error` calls.
