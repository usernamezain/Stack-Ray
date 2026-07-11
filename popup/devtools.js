// devtools.js - Handlers for StackRay DevTools Quick Actions

document.addEventListener("DOMContentLoaded", () => {
  // Bind actions for all 12 tools
  setupTool("tool-designmode", toggleDesignMode, (res) => {
    return `Page Edit Mode is now: ${res.toUpperCase()}`;
  });

  setupTool("tool-wireframe", toggleWireframes, (res) => {
    return `Wireframe elements outline is now: ${res.toUpperCase()}`;
  });

  setupTool("tool-variables", getCSSVariables, (res) => {
    if (res && res.length > 0) {
      return `CSS variables found:\n\n${res.join("\n")}`;
    }
    return "No CSS variables (starting with --) found in style sheets.";
  });

  setupTool("tool-clearstorage", clearPageStorage, (res) => {
    return res;
  });

  setupTool("tool-altinspector", toggleAltInspector, (res) => {
    return `Alt Inspector overlay is now: ${res.toUpperCase()}`;
  });

  setupTool("tool-lowcontrast", toggleColorblindSim, (res) => {
    return `Colorblind Simulation filter is now: ${res.toUpperCase()}`;
  });

  setupTool("tool-missinglabels", checkLabels, (res) => {
    return `Form labels inspector is now: ${res.toUpperCase()}`;
  });

  setupTool("tool-insecurelinks", findInsecureLinks, (res) => {
    return `Insecure HTTP links audit: ${res.toUpperCase()}`;
  });

  setupTool("tool-domdepth", checkDOMDepth, (res) => {
    if (res) {
      return `DOM Nodes count: ${res.count}\nMaximum nesting depth: ${res.maxDepth}`;
    }
    return "Failed to run DOM diagnostics.";
  });

  setupTool("tool-copylinks", getPageLinks, (res) => {
    if (res && res.length > 0) {
      const unique = [...new Set(res)];
      navigator.clipboard.writeText(unique.join("\n"));
      return `Successfully copied ${unique.length} unique links to clipboard!`;
    }
    return "No links found on this page.";
  });

  setupTool("tool-copyimages", getPageImages, (res) => {
    if (res && res.length > 0) {
      const unique = [...new Set(res)];
      navigator.clipboard.writeText(unique.join("\n"));
      return `Successfully copied ${unique.length} unique image URLs to clipboard!`;
    }
    return "No images found on this page.";
  });

  setupTool("tool-copyemails", getPageEmails, (res) => {
    if (res && res.length > 0) {
      navigator.clipboard.writeText(res.join("\n"));
      return `Successfully copied ${res.length} support email addresses to clipboard!`;
    }
    return "No email addresses found on the active page text.";
  });
});

function setupTool(buttonId, pageFunction, formatter) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  btn.addEventListener("click", async () => {
    btn.classList.add("active");
    showDevToolsLog("Executing action...");

    const res = await executeScriptOnPage(pageFunction);

    btn.classList.remove("active");
    
    // Format output
    const output = formatter(res);
    showDevToolsLog(output);
  });
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab ? tab.id : null;
}

async function executeScriptOnPage(func, args = []) {
  const tabId = await getActiveTabId();
  if (!tabId) {
    showDevToolsLog("No active tab context found.");
    return null;
  }
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func,
      args
    });
    return results && results[0] ? results[0].result : null;
  } catch (err) {
    console.error("Script execution failed:", err);
    showDevToolsLog("Script execution blocked or failed. Restricted page?");
    return null;
  }
}

function showDevToolsLog(message) {
  const logEl = document.getElementById("devtools-log");
  if (logEl) {
    logEl.textContent = message;
    logEl.classList.remove("hidden");
  }
}

// ────────────────────────────────────────────────────────────────
// Page Functions executed in Page Context (world: default/MAIN)

function toggleDesignMode() {
  document.designMode = document.designMode === "on" ? "off" : "on";
  return document.designMode;
}

function toggleWireframes() {
  let styleEl = document.getElementById("stackxray-wireframe-style");
  if (styleEl) {
    styleEl.remove();
    return "disabled";
  } else {
    styleEl = document.createElement("style");
    styleEl.id = "stackxray-wireframe-style";
    styleEl.textContent = `
      * {
        outline: 1px solid rgba(124, 58, 237, 0.45) !important;
        outline-offset: -1px !important;
      }
    `;
    document.head.appendChild(styleEl);
    return "enabled";
  }
}

function getCSSVariables() {
  const variables = [];
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = Array.from(sheet.cssRules || sheet.rules);
        for (const rule of rules) {
          if (rule.style) {
            for (let i = 0; i < rule.style.length; i++) {
              const name = rule.style[i];
              if (name.startsWith("--")) {
                const val = rule.style.getPropertyValue(name).trim();
                variables.push(`${name}: ${val}`);
              }
            }
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  try {
    const inline = document.documentElement.style;
    for (let i = 0; i < inline.length; i++) {
      const name = inline[i];
      if (name.startsWith("--")) {
        variables.push(`(inline) ${name}: ${inline.getPropertyValue(name)}`);
      }
    }
  } catch (e) {}
  
  return [...new Set(variables)];
}

function clearPageStorage() {
  try {
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    return "LocalStorage, SessionStorage, and Cookies cleared successfully!";
  } catch (e) {
    return "Failed: " + e.message;
  }
}

function toggleAltInspector() {
  let container = document.getElementById("stackxray-alt-overlay");
  if (container) {
    container.remove();
    return "disabled";
  }
  container = document.createElement("div");
  container.id = "stackxray-alt-overlay";
  document.body.appendChild(container);
  
  const images = Array.from(document.images);
  let count = 0;
  for (const img of images) {
    const rect = img.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) continue;
    
    const altText = img.getAttribute("alt");
    const badge = document.createElement("div");
    badge.className = "stackxray-alt-badge";
    badge.style.cssText = `
      position: absolute;
      top: ${rect.top + window.scrollY}px;
      left: ${rect.left + window.scrollX}px;
      z-index: 100000000;
      background: ${altText ? "#10b981" : "#ef4444"};
      color: #ffffff;
      padding: 2px 6px;
      font-size: 10px;
      border-radius: 4px;
      font-family: sans-serif;
      font-weight: bold;
      pointer-events: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    badge.textContent = altText ? `alt: "${altText}"` : "⚠️ Missing ALT";
    container.appendChild(badge);
    count++;
  }
  return `enabled (${count} images audited)`;
}

function toggleColorblindSim() {
  let filterEl = document.getElementById("stackxray-colorblind-filter");
  if (filterEl) {
    filterEl.remove();
    document.body.style.filter = "";
    return "disabled";
  }
  filterEl = document.createElement("div");
  filterEl.id = "stackxray-colorblind-filter";
  filterEl.innerHTML = `
    <svg style="display:none">
      <defs>
        <filter id="deuteranopia">
          <feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0, 0.7, 0.3, 0, 0, 0, 0, 0.3, 0.7, 0, 0, 0, 0, 0, 1, 0" />
        </filter>
      </defs>
    </svg>
  `;
  document.body.appendChild(filterEl);
  document.body.style.filter = "url(#deuteranopia)";
  return "enabled";
}

function checkLabels() {
  let container = document.getElementById("stackxray-labels-overlay");
  if (container) {
    container.remove();
    // Restore inputs borders
    const inputs = Array.from(document.querySelectorAll("input, select, textarea"));
    for (const input of inputs) {
      if (input._prevBorder !== undefined) {
        input.style.border = input._prevBorder;
      }
    }
    return "disabled";
  }
  container = document.createElement("div");
  container.id = "stackxray-labels-overlay";
  document.body.appendChild(container);
  
  const inputs = Array.from(document.querySelectorAll("input, select, textarea"));
  let issueCount = 0;
  
  for (const input of inputs) {
    if (input.type === "hidden" || input.type === "submit" || input.type === "button") continue;
    
    let hasLabel = false;
    if (input.id) {
      hasLabel = !!document.querySelector(`label[for="${input.id}"]`);
    }
    if (!hasLabel) {
      hasLabel = !!input.closest("label");
    }
    if (!hasLabel) {
      hasLabel = !!input.getAttribute("aria-label") || !!input.getAttribute("aria-labelledby");
    }
    
    if (!hasLabel) {
      const rect = input.getBoundingClientRect();
      const warning = document.createElement("div");
      warning.style.cssText = `
        position: absolute;
        top: ${rect.top + window.scrollY - 18}px;
        left: ${rect.left + window.scrollX}px;
        z-index: 100000000;
        background: #ef4444;
        color: #ffffff;
        padding: 1px 4px;
        font-size: 9px;
        border-radius: 3px;
        font-family: sans-serif;
        font-weight: bold;
        pointer-events: none;
      `;
      warning.textContent = "⚠️ Missing Label";
      container.appendChild(warning);
      
      input._prevBorder = input.style.border;
      input.style.border = "2px dashed #ef4444";
      issueCount++;
    }
  }
  return `enabled (${issueCount} missing labels flagged)`;
}

function findInsecureLinks() {
  let container = document.getElementById("stackxray-insecure-overlay");
  if (container) {
    document.querySelectorAll('a[href^="http://"]').forEach(a => {
      a.style.outline = a._prevOutline || "";
    });
    container.remove();
    return "disabled";
  }
  
  container = document.createElement("div");
  container.id = "stackxray-insecure-overlay";
  document.body.appendChild(container);
  
  const insecureLinks = Array.from(document.querySelectorAll('a[href^="http://"]'));
  for (const a of insecureLinks) {
    a._prevOutline = a.style.outline;
    a.style.outline = "2px dashed #ef4444";
    a.style.outlineOffset = "2px";
  }
  return `enabled (${insecureLinks.length} insecure HTTP links flagged)`;
}

function checkDOMDepth() {
  const elements = Array.from(document.querySelectorAll("*"));
  const count = elements.length;
  
  let maxDepth = 0;
  function getDepth(el) {
    let depth = 0;
    while (el.parentElement) {
      depth++;
      el = el.parentElement;
    }
    return depth;
  }
  
  for (const el of elements) {
    const d = getDepth(el);
    if (d > maxDepth) maxDepth = d;
  }
  
  return { count, maxDepth };
}

function getPageLinks() {
  return Array.from(document.querySelectorAll("a")).map(a => a.href).filter(Boolean);
}

function getPageImages() {
  return Array.from(document.querySelectorAll("img")).map(img => img.src).filter(Boolean);
}

function getPageEmails() {
  const text = document.body.innerText;
  const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  return [...new Set(emails)];
}
