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

  setupTool("tool-disablecss", toggleCSS, (res) => {
    return res;
  });

  setupTool("tool-disabletailwind", toggleTailwind, (res) => {
    return res;
  });

  setupTool("tool-disablescripts", disableScripts, (res) => {
    return res;
  });

  setupTool("tool-cookies", viewCookies, (res) => {
    return res;
  });

  setupTool("tool-colorpicker", pickColor, (res) => {
    return res;
  });

  setupTool("tool-gridflex", highlightGridFlex, (res) => {
    return `Grid & Flexbox visual markers: ${res.toUpperCase()}`;
  });

  setupTool("tool-absolute", highlightAbsoluteFixed, (res) => {
    return `Absolute & Fixed elements highlighting: ${res.toUpperCase()}`;
  });

  setupTool("tool-notransitions", killTransitions, (res) => {
    return `Transitions & Animations state: ${res.toUpperCase()}`;
  });

  setupTool("tool-stripquery", stripURLParams, (res) => {
    return res;
  });

  setupTool("tool-jsonld", extractJsonLd, (res) => {
    if (res && res.length > 0) {
      return `JSON-LD Schema parsed (${res.length} blocks):\n\n${res.map((val, idx) => `[Block ${idx + 1}]\n${JSON.stringify(val, null, 2)}`).join('\n\n')}`;
    }
    return "No JSON-LD schema blocks found on this page.";
  });

  setupTool("tool-metatags", extractMetaTags, (res) => {
    if (res && res.length > 0) {
      return `Meta Tags extracted:\n\n${res.join('\n')}`;
    }
    return "No meta tags found.";
  });

  setupTool("tool-brokenlinks", getPageLinks, async (res) => {
    if (!res || res.length === 0) return "No links to scan.";
    const unique = [...new Set(res)].slice(0, 15);
    showDevToolsLog(`Scanning first ${unique.length} links for status code verification...`);
    
    const results = [];
    for (const url of unique) {
      if (!url.startsWith('http')) {
        results.push(`${url}: ✅ Local / Internal`);
        continue;
      }
      try {
        const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
        results.push(`${url}: ✅ Active`);
      } catch (e) {
        results.push(`${url}: ❌ Failed/Broken`);
      }
    }
    return `Audit Result (Sample of ${unique.length} links):\n\n${results.join('\n')}`;
  });

  setupTool("tool-perfmetrics", getPerfMetrics, (res) => {
    if (res) {
      return `Page Load Performance Metrics:\n` +
             `- DNS Lookup: ${res.dnsTime}ms\n` +
             `- TCP Connection: ${res.connectTime}ms\n` +
             `- Time to First Byte (TTFB): ${res.ttfbTime}ms\n` +
             `- DOM Content Loaded: ${res.domReadyTime}ms\n` +
             `- Full Page Load: ${res.loadTime}ms`;
    }
    return "Timing API not populated. Try reloading page.";
  });

  setupTool("tool-langcharset", getLangCharset, (res) => {
    if (res) {
      return `Document Language: ${res.lang || "Not Set"}\nCharacter Set (Charset): ${res.charset || "Not Set"}\nViewport Config: ${res.viewport || "Not Set"}`;
    }
    return "Failed to audit document lang and encoding.";
  });

  setupTool("tool-showhidden", revealHiddenElements, (res) => {
    return `Hidden elements audit: ${res.toUpperCase()}`;
  });

  setupTool("tool-contenteditable", makeContentEditable, (res) => {
    return `Global contenteditable state: ${res.toUpperCase()}`;
  });

  setupTool("tool-formfiller", fillMockFormData, (res) => {
    return res;
  });

  setupTool("tool-fontviewer", extractFonts, (res) => {
    if (res && res.length > 0) {
      return `Computed Fonts Declared on Page:\n\n${res.join('\n')}`;
    }
    return "Failed to retrieve fonts.";
  });

  setupTool("tool-svgextractor", getPageSVGs, (res) => {
    if (res && res.length > 0) {
      const text = res.join('\n\n');
      navigator.clipboard.writeText(text);
      return `Copied ${res.length} raw SVG elements directly to your clipboard!`;
    }
    return "No inline SVG element found on page.";
  });

  setupTool("tool-tablecsv", convertTableToCSV, (res) => {
    if (res) {
      navigator.clipboard.writeText(res);
      return "Successfully parsed HTML table, generated CSV string and copied to clipboard!";
    }
    return "No tabular table structure found on the active page.";
  });

  setupTool("tool-iframeinspect", inspectIframes, (res) => {
    if (res && res.length > 0) {
      return `Iframes Found (${res.length}):\n\n${res.join('\n')}`;
    }
    return "No iframes found on this page.";
  });

  setupTool("tool-useragent", getUserAgent, (res) => {
    if (res) {
      navigator.clipboard.writeText(res);
      return `User-Agent String:\n\n${res}\n\n(Copied to clipboard)`;
    }
    return "Failed to retrieve agent string.";
  });

  setupTool("tool-viewport", getViewportDetails, (res) => {
    if (res) {
      return `Screen Resolution: ${res.screenWidth} x ${res.screenHeight}\n` +
             `Viewport Size: ${res.viewportWidth} x ${res.viewportHeight}\n` +
             `Device Pixel Ratio: ${res.pixelRatio}x`;
    }
    return "Failed to check viewport parameters.";
  });

  setupTool("tool-scrolltop", scrollToTop, (res) => {
    return res;
  });

  setupTool("tool-scrollbottom", scrollToBottom, (res) => {
    return res;
  });

  const btnInspect = document.getElementById("tool-inspect");
  if (btnInspect) {
    btnInspect.addEventListener("click", async () => {
      const tabId = await getActiveTabId();
      if (!tabId) return;

      const isActive = window.isInspectorActive || false;
      const nextActive = !isActive;
      window.isInspectorActive = nextActive;

      const designBtnInspect = document.getElementById("btn-inspect-design");
      if (designBtnInspect) {
        designBtnInspect.className = nextActive ? "action-btn secondary active" : "action-btn secondary";
        designBtnInspect.querySelector("span").textContent = nextActive ? "Disable Design Inspector" : "Inspect Page Elements";
      }

      const action = nextActive ? 'ENABLE_INSPECTOR' : 'DISABLE_INSPECTOR';
      showDevToolsLog(`Design Inspector is now: ${nextActive ? "ENABLED" : "DISABLED"}. Hover elements on the web page to inspect and copy styling tokens.`);
      
      chrome.tabs.sendMessage(tabId, { action }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn("DevTools inspector toggle failed:", chrome.runtime.lastError.message);
          window.isInspectorActive = isActive;
          if (designBtnInspect) {
            designBtnInspect.className = isActive ? "action-btn secondary active" : "action-btn secondary";
            designBtnInspect.querySelector("span").textContent = isActive ? "Disable Design Inspector" : "Inspect Page Elements";
          }
        }
      });
    });
  }

  setupTool("tool-invertcolors", toggleInvertColors, (res) => {
    return `Invert colors style is now: ${res.toUpperCase()}`;
  });

  setupTool("tool-inlinestyles", highlightInlineStyles, (res) => {
    return `Inline CSS Spotter style is now: ${res.toUpperCase()}`;
  });

  setupTool("tool-resourcecount", countResources, (res) => {
    if (res) {
      return `Page Loaded Assets:\n` +
             `- Scripts (.js): ${res.jsCount}\n` +
             `- Styles (.css): ${res.cssCount}\n` +
             `- Images: ${res.imgCount}\n` +
             `- Fonts: ${res.fontCount}\n` +
             `- Total resources tracked: ${res.totalCount}`;
    }
    return "Failed to analyze page loaded assets.";
  });

  setupTool("tool-idelements", highlightIDElements, (res) => {
    return `ID elements outline is now: ${res.toUpperCase()}`;
  });

  setupTool("tool-listclasses", listCSSClasses, (res) => {
    if (res && res.length > 0) {
      return `Unique CSS Classes declared in active DOM (${res.length}):\n\n${res.join(', ')}`;
    }
    return "No custom classes declared in the active page DOM.";
  });

  setupTool("tool-headings", checkHeadings, (res) => {
    if (res) {
      return `Heading Structure Hierarchy:\n` +
             `- H1 counts: ${res.h1} ${res.h1 === 0 ? "⚠️ (Missing H1!)" : ""}\n` +
             `- H2 counts: ${res.h2}\n` +
             `- H3 counts: ${res.h3}\n` +
             `- H4 counts: ${res.h4}\n` +
             `- H5 counts: ${res.h5}\n` +
             `- H6 counts: ${res.h6}\n\n` +
             `Outline overlay: ${res.status.toUpperCase()}`;
    }
    return "Failed to audit headings.";
  });

  setupTool("tool-showpasswords", showPasswords, (res) => {
    return `Show passwords state: ${res.toUpperCase()}`;
  });

  setupTool("tool-brokenimages", findBrokenImages, (res) => {
    return `Broken images detector is now: ${res.toUpperCase()}`;
  });

  setupTool("tool-printpage", triggerPrintPage, (res) => {
    return "Native printer dialogue prompted.";
  });

  const btnHardReload = document.getElementById("tool-hardreload");
  if (btnHardReload) {
    btnHardReload.addEventListener("click", async () => {
      const tabId = await getActiveTabId();
      if (!tabId) return;
      showDevToolsLog("Bypassing cache and hard reloading current tab...");
      chrome.tabs.reload(tabId, { bypassCache: true });
    });
  }

  const btnScreenshot = document.getElementById("tool-screenshot");
  if (btnScreenshot) {
    btnScreenshot.addEventListener("click", async () => {
      showDevToolsLog("Capturing screen layout visible area...");
      try {
        chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
          if (chrome.runtime.lastError) {
            showDevToolsLog("Error capturing screenshot: " + chrome.runtime.lastError.message);
            return;
          }
          if (dataUrl) {
            chrome.tabs.create({ url: dataUrl });
            showDevToolsLog("Screenshot captured successfully! Opened in a new browser tab.");
          } else {
            showDevToolsLog("Failed to capture visible layout. Check tab permissions.");
          }
        });
      } catch (e) {
        showDevToolsLog("Capture error: " + e.message);
      }
    });
  }
});

function setupTool(buttonId, pageFunction, formatter) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  btn.addEventListener("click", async () => {
    btn.classList.add("active");
    showDevToolsLog("Executing action...");

    const res = await executeScriptOnPage(pageFunction);

    btn.classList.remove("active");
    
    // Handle script execution failure on restricted pages gracefully
    if (res === null || res === undefined) {
      showDevToolsLog("Action failed. Script execution is restricted or blocked on this page context.");
      return;
    }

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

function toggleCSS() {
  let disabled = window._stackXRay_cssDisabled || false;
  disabled = !disabled;
  window._stackXRay_cssDisabled = disabled;
  
  Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach(el => {
    if (el.id && el.id.startsWith('stackxray-')) return;
    el.disabled = disabled;
  });
  return disabled ? "CSS Stylesheets Disabled" : "CSS Stylesheets Enabled";
}

function toggleTailwind() {
  let disabled = window._stackXRay_tailwindDisabled || false;
  disabled = !disabled;
  window._stackXRay_tailwindDisabled = disabled;

  let count = 0;
  Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach(el => {
    if (el.id && el.id.startsWith('stackxray-')) return;
    
    const href = el.getAttribute('href') || '';
    const isTailwindLink = href.includes('tailwind') || href.includes('cdn.tailwindcss.com');
    let isTailwindStyle = false;
    
    if (el.tagName === 'STYLE') {
      const content = el.textContent || '';
      if (content.includes('tailwind') || content.includes('--tw-') || content.includes('.tw-')) {
        isTailwindStyle = true;
      }
    }

    if (isTailwindLink || isTailwindStyle) {
      el.disabled = disabled;
      count++;
    }
  });

  return disabled ? `Disabled ${count} Tailwind CSS stylesheets/blocks` : `Enabled ${count} Tailwind CSS stylesheets/blocks`;
}

function disableScripts() {
  const scripts = Array.from(document.querySelectorAll('script'));
  scripts.forEach(s => s.remove());
  
  let id = window.setTimeout(function() {}, 0);
  while (id--) {
    window.clearTimeout(id);
    window.clearInterval(id);
  }
  
  return `Cleaned ${scripts.length} script elements from the DOM and cleared active setTimeout/setInterval loops. Note: fully disabling active execution context requires disabling JavaScript in Chrome settings.`;
}

function viewCookies() {
  const cookies = document.cookie;
  if (!cookies) return "No cookies found for this domain context.";
  
  const parsed = cookies.split(';').map((c, index) => {
    const parts = c.split('=');
    return `${index + 1}. ${parts[0].trim()} = ${parts.slice(1).join('=').trim()}`;
  });
  return `Cookies found (${parsed.length}):\n\n${parsed.join('\n')}`;
}

async function pickColor() {
  if (!window.EyeDropper) return "EyeDropper API is not supported in this browser.";
  try {
    const eyeDropper = new EyeDropper();
    const result = await eyeDropper.open();
    return `Picked Color Hex: ${result.sRGBHex}`;
  } catch (e) {
    return "Error picking color: " + e.message;
  }
}

function highlightGridFlex() {
  if (window._stackXRay_gridFlexActive) {
    Array.from(document.querySelectorAll('*')).forEach(el => {
      if (el._stackXRay_hadFlexGridHighlight) {
        el.style.outline = el._prevOutline || '';
        delete el._stackXRay_hadFlexGridHighlight;
        delete el._prevOutline;
      }
    });
    window._stackXRay_gridFlexActive = false;
    return "disabled";
  }
  const all = Array.from(document.querySelectorAll('*'));
  let gridCount = 0;
  let flexCount = 0;
  for (const el of all) {
    const display = window.getComputedStyle(el).display;
    if (display === 'flex' || display === 'inline-flex' || display === 'grid' || display === 'inline-grid') {
      el._prevOutline = el.style.outline;
      el._stackXRay_hadFlexGridHighlight = true;
      if (display.includes('flex')) {
        el.style.outline = '2px solid #3b82f6';
        flexCount++;
      } else {
        el.style.outline = '2px solid #10b981';
        gridCount++;
      }
    }
  }
  window._stackXRay_gridFlexActive = true;
  return `enabled (${flexCount} flex elements, ${gridCount} grid elements highlighted)`;
}

function highlightAbsoluteFixed() {
  if (window._stackXRay_absoluteActive) {
    Array.from(document.querySelectorAll('*')).forEach(el => {
      if (el._stackXRay_hadAbsoluteHighlight) {
        el.style.outline = el._prevOutline || '';
        delete el._stackXRay_hadAbsoluteHighlight;
        delete el._prevOutline;
      }
    });
    window._stackXRay_absoluteActive = false;
    return "disabled";
  }
  const all = Array.from(document.querySelectorAll('*'));
  let count = 0;
  for (const el of all) {
    const pos = window.getComputedStyle(el).position;
    if (pos === 'absolute' || pos === 'fixed') {
      el._prevOutline = el.style.outline;
      el._stackXRay_hadAbsoluteHighlight = true;
      el.style.outline = '2px solid #f59e0b';
      count++;
    }
  }
  window._stackXRay_absoluteActive = true;
  return `enabled (${count} absolute/fixed elements highlighted)`;
}

function killTransitions() {
  let styleEl = document.getElementById("stackxray-notransitions-style");
  if (styleEl) {
    styleEl.remove();
    return "disabled";
  } else {
    styleEl = document.createElement("style");
    styleEl.id = "stackxray-notransitions-style";
    styleEl.textContent = `
      * {
        transition: none !important;
        animation: none !important;
      }
    `;
    document.head.appendChild(styleEl);
    return "enabled";
  }
}

function stripURLParams() {
  const url = window.location.origin + window.location.pathname;
  window.location.href = url;
  return "Reloading page without query parameters or hash...";
}

function extractJsonLd() {
  const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  return scripts.map(s => {
    try {
      return JSON.parse(s.textContent);
    } catch (e) {
      return { error: "Failed to parse JSON schema: " + e.message };
    }
  });
}

function extractMetaTags() {
  return Array.from(document.querySelectorAll('meta')).map(m => {
    const name = m.getAttribute('name') || m.getAttribute('property') || m.getAttribute('http-equiv') || '';
    const content = m.getAttribute('content') || '';
    if (name) {
      return `${name}: ${content}`;
    }
    return '';
  }).filter(Boolean);
}

function getPerfMetrics() {
  const t = window.performance.timing;
  if (!t || t.navigationStart === 0) return null;
  return {
    dnsTime: t.domainLookupEnd - t.domainLookupStart,
    connectTime: t.connectEnd - t.connectStart,
    ttfbTime: t.responseStart - t.requestStart,
    domReadyTime: t.domContentLoadedEventEnd - t.navigationStart,
    loadTime: t.loadEventEnd - t.navigationStart
  };
}

function getLangCharset() {
  const lang = document.documentElement.lang;
  const metaCharset = document.querySelector('meta[charset]');
  const charset = metaCharset ? metaCharset.getAttribute('charset') : (document.characterSet || document.charset);
  const metaViewport = document.querySelector('meta[name="viewport"]');
  const viewport = metaViewport ? metaViewport.getAttribute('content') : '';
  return { lang, charset, viewport };
}

function revealHiddenElements() {
  if (window._stackXRay_hiddenRevealed) {
    document.querySelectorAll('*').forEach(el => {
      if (el._stackXRay_hadHiddenReveal) {
        el.style.display = el._prevDisplay || '';
        el.style.visibility = el._prevVisibility || '';
        el.style.opacity = el._prevOpacity || '';
        el.style.outline = el._prevOutline || '';
        delete el._stackXRay_hadHiddenReveal;
      }
    });
    window._stackXRay_hiddenRevealed = false;
    return "disabled (restored previous display properties)";
  }
  const all = Array.from(document.querySelectorAll('*'));
  let count = 0;
  for (const el of all) {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'HEAD') continue;
    const style = window.getComputedStyle(el);
    const isHidden = style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0;
    
    if (isHidden) {
      el._prevDisplay = el.style.display;
      el._prevVisibility = el.style.visibility;
      el._prevOpacity = el.style.opacity;
      el._prevOutline = el.style.outline;
      el._stackXRay_hadHiddenReveal = true;
      
      el.style.display = 'block';
      el.style.visibility = 'visible';
      el.style.opacity = '1';
      el.style.outline = '2px dashed #f59e0b';
      count++;
    }
  }
  window._stackXRay_hiddenRevealed = true;
  return `enabled (revealed and outlined ${count} hidden elements)`;
}

function makeContentEditable() {
  let isEditable = window._stackXRay_contentEditable || false;
  isEditable = !isEditable;
  window._stackXRay_contentEditable = isEditable;
  
  document.body.contentEditable = isEditable;
  return isEditable ? "enabled (all elements editable)" : "disabled";
}

function fillMockFormData() {
  const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
  let count = 0;
  for (const input of inputs) {
    if (input.disabled || input.readOnly) continue;
    
    const type = input.getAttribute('type') || 'text';
    
    if (type === 'text' || input.tagName === 'TEXTAREA') {
      const name = (input.getAttribute('name') || input.getAttribute('id') || '').toLowerCase();
      if (name.includes('name')) {
        input.value = "John Doe";
      } else if (name.includes('phone') || name.includes('tel')) {
        input.value = "+1 (555) 019-2834";
      } else if (name.includes('zip') || name.includes('postal')) {
        input.value = "94043";
      } else if (name.includes('city')) {
        input.value = "Mountain View";
      } else {
        input.value = "Hello World";
      }
      count++;
    } else if (type === 'email') {
      input.value = "test.developer@example.com";
      count++;
    } else if (type === 'number') {
      input.value = "42";
      count++;
    } else if (type === 'password') {
      input.value = "StackRayDevToolsP@ss123";
      count++;
    } else if (type === 'tel') {
      input.value = "+1 (555) 019-2834";
      count++;
    } else if (input.tagName === 'SELECT') {
      if (input.options.length > 1) {
        input.selectedIndex = 1;
        count++;
      }
    }
  }
  return `Successfully populated ${count} input fields with test data!`;
}

function extractFonts() {
  const fonts = [];
  document.querySelectorAll('*').forEach(el => {
    const f = window.getComputedStyle(el).fontFamily;
    if (f) fonts.push(f);
  });
  return [...new Set(fonts)].slice(0, 20);
}

function getPageSVGs() {
  return Array.from(document.querySelectorAll('svg')).map(svg => svg.outerHTML);
}

function convertTableToCSV() {
  const table = document.querySelector('table');
  if (!table) return null;
  
  const rows = Array.from(table.querySelectorAll('tr'));
  const csv = rows.map(row => {
    const cells = Array.from(row.querySelectorAll('th, td'));
    return cells.map(cell => {
      let text = cell.innerText.replace(/"/g, '""');
      return `"${text}"`;
    }).join(',');
  }).join('\n');
  
  return csv;
}

function inspectIframes() {
  return Array.from(document.querySelectorAll('iframe')).map((ifr, idx) => {
    const src = ifr.getAttribute('src') || 'About:Blank';
    const sandbox = ifr.getAttribute('sandbox') || 'None';
    return `${idx + 1}. Source: ${src}\n   Sandbox: ${sandbox}`;
  });
}

function getUserAgent() {
  return navigator.userAgent;
}

function getViewportDetails() {
  return {
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio
  };
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  return "Scrolled window to coordinate (0, 0) smoothly.";
}

function scrollToBottom() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  return "Scrolled window to page height coordinate smoothly.";
}

function toggleCSS() {
  let disabled = window._stackXRay_cssDisabled || false;
  disabled = !disabled;
  window._stackXRay_cssDisabled = disabled;
  
  Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach(el => {
    if (el.id && el.id.startsWith('stackxray-')) return;
    el.disabled = disabled;
  });
  return disabled ? "CSS Stylesheets Disabled" : "CSS Stylesheets Enabled";
}

function toggleTailwind() {
  let disabled = window._stackXRay_tailwindDisabled || false;
  disabled = !disabled;
  window._stackXRay_tailwindDisabled = disabled;

  let count = 0;
  Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).forEach(el => {
    if (el.id && el.id.startsWith('stackxray-')) return;
    
    const href = el.getAttribute('href') || '';
    const isTailwindLink = href.includes('tailwind') || href.includes('cdn.tailwindcss.com');
    let isTailwindStyle = false;
    
    if (el.tagName === 'STYLE') {
      const content = el.textContent || '';
      if (content.includes('tailwind') || content.includes('--tw-') || content.includes('.tw-')) {
        isTailwindStyle = true;
      }
    }

    if (isTailwindLink || isTailwindStyle) {
      el.disabled = disabled;
      count++;
    }
  });

  return disabled ? `Disabled ${count} Tailwind CSS stylesheets/blocks` : `Enabled ${count} Tailwind CSS stylesheets/blocks`;
}

function disableScripts() {
  const scripts = Array.from(document.querySelectorAll('script'));
  scripts.forEach(s => s.remove());
  
  let id = window.setTimeout(function() {}, 0);
  while (id--) {
    window.clearTimeout(id);
    window.clearInterval(id);
  }
  
  return `Cleaned ${scripts.length} script elements from the DOM and cleared active setTimeout/setInterval loops. Note: fully disabling active execution context requires disabling JavaScript in Chrome settings.`;
}

function viewCookies() {
  const cookies = document.cookie;
  if (!cookies) return "No cookies found for this domain context.";
  
  const parsed = cookies.split(';').map((c, index) => {
    const parts = c.split('=');
    return `${index + 1}. ${parts[0].trim()} = ${parts.slice(1).join('=').trim()}`;
  });
  return `Cookies found (${parsed.length}):\n\n${parsed.join('\n')}`;
}

function toggleInvertColors() {
  let styleEl = document.getElementById("stackxray-invert-style");
  if (styleEl) {
    styleEl.remove();
    return "disabled";
  } else {
    styleEl = document.createElement("style");
    styleEl.id = "stackxray-invert-style";
    styleEl.textContent = `
      html {
        filter: invert(1) hue-rotate(180deg) !important;
      }
    `;
    document.head.appendChild(styleEl);
    return "enabled";
  }
}

function highlightInlineStyles() {
  if (window._stackXRay_inlineActive) {
    Array.from(document.querySelectorAll('[style]')).forEach(el => {
      if (el._stackXRay_hadInlineHighlight) {
        el.style.outline = el._prevOutline || '';
        delete el._stackXRay_hadInlineHighlight;
        delete el._prevOutline;
      }
    });
    window._stackXRay_inlineActive = false;
    return "disabled";
  }
  const elements = Array.from(document.querySelectorAll('[style]'));
  let count = 0;
  for (const el of elements) {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'HEAD') continue;
    el._prevOutline = el.style.outline;
    el._stackXRay_hadInlineHighlight = true;
    el.style.outline = '2px solid #a855f7';
    count++;
  }
  window._stackXRay_inlineActive = true;
  return `enabled (${count} inline styled tags highlighted)`;
}

function countResources() {
  try {
    const resources = performance.getEntriesByType('resource');
    let jsCount = 0;
    let cssCount = 0;
    let imgCount = 0;
    let fontCount = 0;
    for (const r of resources) {
      const type = r.initiatorType;
      const url = r.name || '';
      if (type === 'script' || url.endsWith('.js')) jsCount++;
      else if (type === 'css' || url.endsWith('.css')) cssCount++;
      else if (type === 'img' || url.includes('.png') || url.includes('.jpg') || url.includes('.webp') || url.includes('.svg') || url.includes('.gif')) imgCount++;
      else if (type === 'css' && (url.includes('.woff') || url.includes('.ttf') || url.includes('.otf'))) fontCount++;
    }
    return {
      jsCount,
      cssCount,
      imgCount,
      fontCount,
      totalCount: resources.length
    };
  } catch (e) {
    return null;
  }
}

function highlightIDElements() {
  if (window._stackXRay_idActive) {
    Array.from(document.querySelectorAll('[id]')).forEach(el => {
      if (el._stackXRay_hadIdHighlight) {
        el.style.outline = el._prevOutline || '';
        delete el._stackXRay_hadIdHighlight;
        delete el._prevOutline;
      }
    });
    window._stackXRay_idActive = false;
    return "disabled";
  }
  const elements = Array.from(document.querySelectorAll('[id]'));
  let count = 0;
  for (const el of elements) {
    if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.id.startsWith('stackxray-')) continue;
    el._prevOutline = el.style.outline;
    el._stackXRay_hadIdHighlight = true;
    el.style.outline = '2px solid #ec4899';
    count++;
  }
  window._stackXRay_idActive = true;
  return `enabled (${count} ID elements highlighted)`;
}

function listCSSClasses() {
  const classes = [];
  document.querySelectorAll('*').forEach(el => {
    if (el.classList.length > 0) {
      el.classList.forEach(c => classes.push(c));
    }
  });
  return [...new Set(classes)].slice(0, 50);
}

function checkHeadings() {
  const h1 = document.querySelectorAll('h1').length;
  const h2 = document.querySelectorAll('h2').length;
  const h3 = document.querySelectorAll('h3').length;
  const h4 = document.querySelectorAll('h4').length;
  const h5 = document.querySelectorAll('h5').length;
  const h6 = document.querySelectorAll('h6').length;
  
  let status = "disabled";
  if (window._stackXRay_headingsActive) {
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
      el.style.outline = el._prevOutline || '';
      delete el._prevOutline;
    });
    window._stackXRay_headingsActive = false;
  } else {
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
      el._prevOutline = el.style.outline;
      el.style.outline = '2px dashed #06b6d4';
    });
    window._stackXRay_headingsActive = true;
    status = "enabled (Cyan outlines on headings)";
  }
  
  return { h1, h2, h3, h4, h5, h6, status };
}

function showPasswords() {
  let active = window._stackXRay_passwordsActive || false;
  active = !active;
  window._stackXRay_passwordsActive = active;

  const passwords = Array.from(document.querySelectorAll('input[type="password"], input[data-prev-type="password"]'));
  for (const input of passwords) {
    if (active) {
      input.setAttribute('data-prev-type', 'password');
      input.setAttribute('type', 'text');
    } else {
      input.setAttribute('type', 'password');
    }
  }
  return active ? "passwords revealed" : "passwords hidden";
}

function findBrokenImages() {
  if (window._stackXRay_brokenImagesActive) {
    document.querySelectorAll('img').forEach(img => {
      img.style.outline = img._prevOutline || '';
      delete img._prevOutline;
    });
    window._stackXRay_brokenImagesActive = false;
    return "disabled";
  }
  const images = Array.from(document.querySelectorAll('img'));
  let count = 0;
  for (const img of images) {
    const isBroken = img.naturalWidth === 0 || img.complete === false;
    if (isBroken) {
      img._prevOutline = img.style.outline;
      img.style.outline = '3px solid #ef4444';
      count++;
    }
  }
  window._stackXRay_brokenImagesActive = true;
  return `enabled (${count} broken images flagged in red)`;
}

function triggerPrintPage() {
  window.print();
  return "triggered";
}
