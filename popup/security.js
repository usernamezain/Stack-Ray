// security.js - Auditing headers, cookies, and DOM security features

async function runSecurityAudit() {
  const sslEl = document.getElementById("security-ssl");
  const headersEl = document.getElementById("security-headers");
  const cookiesEl = document.getElementById("security-cookies");
  const domEl = document.getElementById("security-dom");

  // Show loading indicators
  if (sslEl) sslEl.innerHTML = '<div class="loading"><div class="spinner"></div>Checking connection security...</div>';
  if (headersEl) headersEl.innerHTML = '<div class="loading"><div class="spinner"></div>Fetching security headers...</div>';
  if (cookiesEl) cookiesEl.innerHTML = '<div class="loading"><div class="spinner"></div>Auditing cookie settings...</div>';
  if (domEl) domEl.innerHTML = '<div class="loading"><div class="spinner"></div>Scanning DOM elements...</div>';

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || !tab.url) {
    const errorMsg = '<div class="error">No active tab context found.</div>';
    if (sslEl) sslEl.innerHTML = errorMsg;
    if (headersEl) headersEl.innerHTML = errorMsg;
    if (cookiesEl) cookiesEl.innerHTML = errorMsg;
    if (domEl) domEl.innerHTML = errorMsg;
    return;
  }

  const urlObj = new URL(tab.url);
  const isHttps = urlObj.protocol === "https:";

  // 1. SSL Connection Audit
  if (sslEl) {
    sslEl.innerHTML = `
      <div class="security-row">
        <div class="security-label-group">
          <span class="security-indicator">${isHttps ? "✅" : "❌"}</span>
          <span>HTTPS Protocol Connection</span>
        </div>
        <span class="security-badge ${isHttps ? "secure" : "danger"}">${isHttps ? "SSL Active" : "Insecure HTTP"}</span>
      </div>
    `;
  }

  // 2. HTTP Headers Audit
  if (headersEl && isHttps) {
    try {
      const response = await fetch(tab.url, { method: "HEAD" });
      const csp = response.headers.get("content-security-policy");
      const hsts = response.headers.get("strict-transport-security");
      const xframe = response.headers.get("x-frame-options");
      const contentType = response.headers.get("x-content-type-options");

      headersEl.innerHTML = `
        <div class="security-row">
          <div class="security-label-group">
            <span class="security-indicator">${csp ? "✅" : "⚠️"}</span>
            <span>Content Security Policy (CSP)</span>
          </div>
          <span class="security-badge ${csp ? "secure" : "warning"}">${csp ? "Configured" : "Missing"}</span>
        </div>
        <div class="security-row">
          <div class="security-label-group">
            <span class="security-indicator">${hsts ? "✅" : "⚠️"}</span>
            <span>Strict-Transport-Security (HSTS)</span>
          </div>
          <span class="security-badge ${hsts ? "secure" : "warning"}">${hsts ? "Configured" : "Missing"}</span>
        </div>
        <div class="security-row">
          <div class="security-label-group">
            <span class="security-indicator">${xframe ? "✅" : "⚠️"}</span>
            <span>X-Frame-Options (Clickjacking)</span>
          </div>
          <span class="security-badge ${xframe ? "secure" : "warning"}">${xframe ? "Configured" : "Missing"}</span>
        </div>
        <div class="security-row">
          <div class="security-label-group">
            <span class="security-indicator">${contentType ? "✅" : "⚠️"}</span>
            <span>X-Content-Type-Options</span>
          </div>
          <span class="security-badge ${contentType ? "secure" : "warning"}">${contentType ? "Configured" : "Missing"}</span>
        </div>
      `;
    } catch (err) {
      headersEl.innerHTML = `<div class="error">Security headers audit failed. (Page blocks HEAD requests or CORS?)</div>`;
    }
  } else if (headersEl) {
    headersEl.innerHTML = `<div class="error">HTTP response headers audit requires SSL HTTPS connection.</div>`;
  }

  // 3. Cookies Audit
  if (cookiesEl) {
    try {
      chrome.cookies.getAll({ domain: urlObj.hostname }, (cookies) => {
        if (!cookies || cookies.length === 0) {
          cookiesEl.innerHTML = '<div class="info-line" style="font-size:11px;color:#737373;padding:8px;">No cookies stored for this host domain.</div>';
          return;
        }
        let secureCount = 0;
        let httpOnlyCount = 0;
        let sameSiteCount = 0;

        cookies.forEach(c => {
          if (c.secure) secureCount++;
          if (c.httpOnly) httpOnlyCount++;
          if (c.sameSite && c.sameSite !== "no_restriction") sameSiteCount++;
        });

        cookiesEl.innerHTML = `
          <div class="security-row">
            <div class="security-label-group">
              <span class="security-indicator">🍪</span>
              <span>Total Host Cookies Found</span>
            </div>
            <span class="security-badge secure">${cookies.length} Cookies</span>
          </div>
          <div class="security-row">
            <div class="security-label-group">
              <span class="security-indicator">${secureCount === cookies.length ? "✅" : "⚠️"}</span>
              <span>Secure Flag Configured</span>
            </div>
            <span class="security-badge ${secureCount === cookies.length ? "secure" : "warning"}">${secureCount}/${cookies.length} Cookies</span>
          </div>
          <div class="security-row">
            <div class="security-label-group">
              <span class="security-indicator">${httpOnlyCount === cookies.length ? "✅" : "⚠️"}</span>
              <span>HttpOnly Flag Configured</span>
            </div>
            <span class="security-badge ${httpOnlyCount === cookies.length ? "secure" : "warning"}">${httpOnlyCount}/${cookies.length} Cookies</span>
          </div>
          <div class="security-row">
            <div class="security-label-group">
              <span class="security-indicator">${sameSiteCount > 0 ? "✅" : "⚠️"}</span>
              <span>SameSite Rules Defined</span>
            </div>
            <span class="security-badge ${sameSiteCount > 0 ? "secure" : "warning"}">${sameSiteCount}/${cookies.length} Cookies</span>
          </div>
        `;
      });
    } catch (e) {
      cookiesEl.innerHTML = `<div class="error">Cookies audit permission error: ${e.message}</div>`;
    }
  }

  // 4. DOM Security Audit
  if (domEl) {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const forms = Array.from(document.querySelectorAll("form"));
          const insecureForms = forms.filter(f => {
            const act = f.getAttribute("action") || "";
            return act.startsWith("http://");
          }).length;

          const blankAnchors = Array.from(document.querySelectorAll("a[target='_blank']"));
          const missingNoopener = blankAnchors.filter(a => {
            const rel = (a.getAttribute("rel") || "").toLowerCase();
            return !rel.includes("noopener") && !rel.includes("noreferrer");
          }).length;

          const inlineStyles = document.querySelectorAll("[style]").length;

          return { insecureForms, missingNoopener, inlineStyles };
        }
      });

      const res = results && results[0] ? results[0].result : { insecureForms: 0, missingNoopener: 0, inlineStyles: 0 };
      domEl.innerHTML = `
        <div class="security-row">
          <div class="security-label-group">
            <span class="security-indicator">${res.insecureForms === 0 ? "✅" : "❌"}</span>
            <span>Insecure form action targets (HTTP links)</span>
          </div>
          <span class="security-badge ${res.insecureForms === 0 ? "secure" : "danger"}">${res.insecureForms} targets found</span>
        </div>
        <div class="security-row">
          <div class="security-label-group">
            <span class="security-indicator">${res.missingNoopener === 0 ? "✅" : "⚠️"}</span>
            <span>Target _blank rel="noopener" check</span>
          </div>
          <span class="security-badge ${res.missingNoopener === 0 ? "secure" : "warning"}">${res.missingNoopener} missing tags</span>
        </div>
        <div class="security-row">
          <div class="security-label-group">
            <span class="security-indicator">${res.inlineStyles === 0 ? "✅" : "⚠️"}</span>
            <span>CSP bypass vulnerability (Inline Styles)</span>
          </div>
          <span class="security-badge ${res.inlineStyles === 0 ? "secure" : "warning"}">${res.inlineStyles} inline styles</span>
        </div>
      `;
    } catch (err) {
      domEl.innerHTML = `<div class="error">DOM Security scan blocked or failed. Restricted page context?</div>`;
    }
  }
}
