# System Integrations & Injection Flows - StackRay

StackRay relies on a dual-world injection architecture to inspect the page DOM, read window globals, intercept network calls, and query resource headers.

```mermaid
sequenceDiagram
    participant P as Popup Script (popup.js)
    participant IS as Isolated World (content.js)
    participant MW as Main World (inject.js / page)
    participant H as Server / HTTP Headers

    Note over IS,MW: Page Load / Document Start
    IS->>MW: Inject inject.js script tag
    activate MW
    MW->>MW: Override window.fetch & console.error
    deactivate MW

    Note over P: User Opens Popup
    P->>P: Query active tab URL
    P->>MW: Inject categories.js (MAIN World)
    P->>MW: Inject & Run detectTechnologies() (MAIN World)
    
    alt MAIN World Execution Fails (CSP or Browser restrictions)
        P->>IS: Inject categories.js (ISOLATED World Fallback)
        P->>IS: Inject & Run detectTechnologies() (ISOLATED World Fallback)
    end
    
    MW->>P: Return technology, accessibility & performance data
    P->>H: Fetch HTTP HEAD (hosting & backend server headers)
    P->>P: Render results in tabs
```

## 1. Page World Separation
Chrome Extensions execute scripts in two main contexts:
1. **Isolated World (Content Scripts)**: Has direct access to the page DOM, but is isolated from the page's execution scope (cannot read `window` globals defined by page scripts, and page scripts cannot read the extension's variables).
2. **Main World (Page Scope)**: Executes in the same scope as standard page scripts. It can read page variables, modify `window` prototypes, and access page-specific JS frameworks (e.g. `window.React`).

## 2. Injection Channels
- **Injected Script (`inject.js`)**: Injected via a dynamic script tag inside `content.js` at `document_start`. It modifies `window.fetch` and `console.error` to collect diagnostics in `window._stackXRay_Net` in the page scope.
- **Scripting API Injection (`categories.js` & `detectTechnologies()`)**: Executed from `popup.js` using `chrome.scripting.executeScript`. Attempts to run in `world: "MAIN"` to query page-level global variables. If blocked by Content Security Policy (CSP), falls back to the default `ISOLATED` world execution.

## 3. Network Discovery
- Intercepts `window.fetch` calls inside the page context to log requests.
- Checks request body contents for GraphQL operations (queries and mutations).
- Executes an out-of-band `fetch` HEAD request to the origin URL to inspect headers (like `server`, `x-powered-by`, `x-vercel-id`, `x-nf-request-id`, `cf-ray`) to identify hosts (Vercel, Netlify, Cloudflare) and web servers (Nginx, Apache).
