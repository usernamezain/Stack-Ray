# Architecture & Data Lifecycle - StackRay

This document describes the structural architecture and data flow within the StackRay extension.

## 1. Directory Structure

- `manifest.json`: Defines entry points, metadata, and permission scopes.
- `content.js`: Main Content Script injected at `document_start` to inject `inject.js` into the page.
- `inject.js`: Lightweight agent injected into the main page context to hook fetch requests and console logs.
- `categories.js`: Technology classification rules engine, housing the `TechDetector` detector utility.
- `popup/`:
  - `popup.html`: The HTML layout for the dashboard.
  - `popup.js`: Controller that queries active tab metadata, manages tabs, triggers page scanning, parses results, and exports reports.
  - `popup.css`: Visual styling system.
- `icons/`: Extension icons.

## 2. Dynamic Scan Data Structure

The central data structure passed from `detectTechnologies()` to `popup.js` is the `result` object:

```json
{
  "tech": {
    "React": { "detected": true, "version": "18.2.0", "category": "Frontend Frameworks" },
    "Tailwind": { "detected": true, "version": null, "category": "UI & CSS Frameworks" }
  },
  "perf": {
    "CLS": 0.015,
    "FCP": 850.4,
    "LCP": 1200.2
  },
  "a11y": {
    "imagesTotal": 12,
    "imagesExempt": 2,
    "imagesMissingAlt": 1,
    "imagesEmptyAlt": 9,
    "hasMain": true,
    "hasHeader": true,
    "hasNav": true,
    "hasFooter": true,
    "hasH1": true,
    "buttonsTotal": 5,
    "buttonsUnlabeled": 0,
    "linksTotal": 24,
    "linksUnlabeled": 2,
    "inputsTotal": 2,
    "inputsMissingLabel": 0
  },
  "leads": {
    "emails": ["sales@example.com"],
    "phones": ["+1-555-0199"],
    "socials": ["https://linkedin.com/company/example"],
    "contactPages": ["https://example.com/contact"]
  },
  "net": {
    "errors": 2,
    "graphqlCounts": 1,
    "apiCounts": 5
  },
  "deepLibs": [
    "lodash",
    "moment.js"
  ],
  "seo": {
    "title": "Example Domain",
    "description": "This is an example website.",
    "canonical": "https://example.com/",
    "h1Count": 1,
    "ogTags": 4
  },
  "design": {
    "fonts": { "Inter": 125, "system-ui": 80 },
    "colors": { "rgb(15, 23, 42)": 84, "rgb(255, 255, 255)": 150 },
    "borderRadius": { "8px": 12, "4px": 6 },
    "paddings": { "12px 16px": 25 },
    "margins": { "8px": 14 }
  },
  "pageText": "Raw text content of the page..."
}
```

## 3. Rendering Process

1. **Tab Handling**: Popup event listeners toggle CSS `.active` classes on click, modifying tab page visibility and scrolling headers into view.
2. **Tech Rendering**: Generates categorised lists dynamically. Filters technologies from `categories.js` classification map.
3. **SEO Audit**: Computes a health score (0-100) based on title, description, headers, og-tags, and canonical metrics, displaying the score inside an animated SVG circle.
4. **Performance Cards**: Compiles FCP, LCP, and CLS scores, applying relative bar widths and color states depending on performance quality boundaries.
5. **CSV/JSON Exporters**: Packages user-selected checkbox categories into a file download payload (`Blob` URL trigger).
