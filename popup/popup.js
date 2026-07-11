let currentResults = null;
let currentTabId = null;
let isScanning = false;

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Tab switching logic
  const tabBtns = document.querySelectorAll(".nav-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(btn.dataset.target).classList.add("active");

      // Scroll the tab button into view if it's partially hidden
      btn.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    });
  });

  // Credit Panel click toggle helper
  const creditTrigger = document.getElementById("credit-trigger");
  const creditPanel = document.getElementById("credit-panel");
  if (creditTrigger && creditPanel) {
    creditTrigger.onclick = (e) => {
      e.stopPropagation();
      creditPanel.classList.toggle("active");
    };

    creditPanel.onclick = (e) => {
      e.stopPropagation();
    };
    
    document.addEventListener("click", () => {
      creditPanel.classList.remove("active");
    });

    const creditLinks = creditPanel.querySelectorAll(".credit-link");
    creditLinks.forEach((link) => {
      link.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const url = link.getAttribute("href");
        if (url) {
          chrome.tabs.create({ url: url });
        }
        creditPanel.classList.remove("active");
      };
    });
  }

  // 2. Initialize keyboard commands and console stream listeners
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'export-data') {
      if (currentResults) {
        exportData(currentResults, 'json');
      } else {
        alert("No profile data captured yet to export.");
      }
    } else if (message.action === 'CONSOLE_STREAM_LOG' && message.log) {
      appendTerminalLine(message.log);
    }
  });

  // 3. Initialize AI Summarizer controls
  initAiSummaryTab();

  // 4. Initialize Design Inspector controls
  initDesignInspector();

  // 5. Initialize Live Console controls
  initConsoleTerminal();

  // 6. Initial profiling scan
  await runProfileForActiveTab();

  // 7. Track dynamic tab shifts and page reloads when Side Panel is open
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (activeTab && activeTab.id === activeInfo.tabId) {
        await runProfileForActiveTab();
      }
    } catch (e) {
      console.warn("Tab activation sync error:", e);
    }
  });

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete") {
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (activeTab && activeTab.id === tabId) {
          await runProfileForActiveTab();
        }
      } catch (e) {
        console.warn("Tab update sync error:", e);
      }
    }
  });
});

async function runProfileForActiveTab() {
  if (isScanning) return;
  isScanning = true;

  // Turn off design inspector on navigation/reload to keep clean state
  disableInspectorState();

  // Reset live terminal logs
  resetConsoleTerminal();

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });

    if (!tab) {
      isScanning = false;
      return;
    }

    currentTabId = tab.id;
    const url = (tab && (tab.url || tab.pendingUrl)) || "";

    if (
      !url ||
      url.startsWith("chrome://") ||
      url.startsWith("edge://") ||
      url.startsWith("about:") ||
      url.includes("chrome.google.com/webstore")
    ) {
      document.getElementById("url").textContent = "Restricted Page";
      document.getElementById("tech-results").innerHTML =
        '<div class="error">Cannot scan this restricted page. Chrome restricts extensions here.</div>';
      isScanning = false;
      return;
    }

    const urlObj = new URL(url);
    document.getElementById("url").textContent = urlObj.hostname;

    // Reset status elements for clean profiling loading states
    document.getElementById("tech-results").innerHTML = '<div class="loading"><div class="spinner"></div>Scanning Stack...</div>';
    document.getElementById("design-results").innerHTML = '<div class="loading"><div class="spinner"></div>Extracting Design Variables...</div>';
    document.getElementById("seo-results").innerHTML = '<div class="loading"><div class="spinner"></div>Auditing SEO...</div>';
    document.getElementById("kw-robots").innerHTML = '<div class="loading"><div class="spinner"></div>Checking...</div>';
    document.getElementById("perf-results").innerHTML = '<div class="loading"><div class="spinner"></div>Measuring Core Web Vitals...</div>';
    document.getElementById("a11y-results").innerHTML = '<div class="loading"><div class="spinner"></div>Auditing Accessibility...</div>';
    document.getElementById("net-results").innerHTML = '<div class="loading"><div class="spinner"></div>Intercepting Network &amp; Console...</div>';
    document.getElementById("leads-results").innerHTML = '<div class="loading"><div class="spinner"></div>Hunting for Contacts &amp; Footprints...</div>';
    document.getElementById("domain-hosting").innerHTML = '<div class="loading"><div class="spinner"></div>Fetching hosting info...</div>';
    document.getElementById("domain-whois").innerHTML = '<div class="loading"><div class="spinner"></div>Fetching WHOIS info...</div>';
    document.getElementById("ai-results").innerHTML = '<div class="no-results">Click "Generate AI Summary" to summarize page contents with local Gemini Nano model.</div>';
    document.getElementById("ai-warning").classList.add("hidden");
    
    document.getElementById("seo-score-value").textContent = "--";
    const ring = document.getElementById("seo-score-ring");
    if (ring) ring.style.strokeDashoffset = "226.2";

    // 1. Inject categories.js into the MAIN world first (contains the engine)
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["categories.js"],
        world: "MAIN",
      });
    } catch (err) {
      console.warn("Injecting categories.js into MAIN failed:", err);
      // Try injecting into ISOLATED as a secondary fallback if MAIN is blocked by CSP
      await chrome.scripting
        .executeScript({
          target: { tabId: tab.id },
          files: ["categories.js"],
        })
        .catch((e) => console.error("Total injection failure:", e));
    }

    // 2. Run the detection function
    const injectionResults = await chrome.scripting
      .executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        func: detectTechnologies,
      })
      .catch((err) => {
        // Fallback for older browsers or strict CSP
        console.warn("Running detection in MAIN failed, trying ISOLATED", err);
        return chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: detectTechnologies,
        });
      });

    if (
      !injectionResults ||
      !injectionResults[0] ||
      !injectionResults[0].result
    ) {
      const errDiv =
        '<div class="error">Injection failed. Page might not be fully loaded. Refresh and try again.</div>';
      document.getElementById("tech-results").innerHTML = errDiv;
      document.getElementById("perf-results").innerHTML = errDiv;
      document.getElementById("a11y-results").innerHTML = errDiv;
      isScanning = false;
      return;
    }

    const data = injectionResults[0].result;
    renderTechResults(data);
    if (data.perf) renderPerfResults(data.perf);
    if (data.a11y) renderA11yResults(data.a11y);
    if (data.leads) renderLeadsResults(data.leads);
    if (data.net) renderNetResults(data.net);
    if (data.design) renderDesignResults(data.design);
    if (data.seo) renderSeoResults(data.seo);
    if (data.keywords) renderKeywordsResults(data.keywords);

    // Render timing waterfall & social card previews
    if (data.timing) renderWaterfallResults(data.timing);
    if (data.seo) renderSocialPreviews(data.seo, urlObj.hostname);

    // Trigger Hosting and WHOIS background lookup
    runDomainLookup(urlObj.hostname);

    // Query cached console logs from the content script
    try {
      chrome.tabs.sendMessage(tab.id, { action: 'GET_CONSOLE_LOGS' }, (response) => {
        if (response && response.logs) {
          response.logs.forEach(log => appendTerminalLine(log));
        }
      });
    } catch (e) {
      console.warn("Could not retrieve cached console logs:", e);
    }

    // Initialize Action buttons
    document.getElementById("btn-export-json").onclick = () => {
      if (data) exportData(data, "json");
      else alert("No data to export yet.");
    };
    document.getElementById("btn-export-csv").onclick = () => {
      if (data) exportData(data, "csv");
      else alert("No data to export yet.");
    };

    // Store results globally
    currentResults = data;

    // Copy HEX List
    const copyColorsBtn = document.getElementById("btn-copy-colors");
    if (copyColorsBtn && data.design && data.design.colors) {
      copyColorsBtn.onclick = () => {
        const colors = Object.keys(data.design.colors).join(", ");
        navigator.clipboard.writeText(colors);
        const originalText = copyColorsBtn.textContent;
        copyColorsBtn.textContent = "Copied!";
        setTimeout(() => (copyColorsBtn.textContent = originalText), 1500);
      };
    }

    // Copy All Page Text
    const copyTextBtn = document.getElementById("btn-copy-text");
    if (copyTextBtn) {
      copyTextBtn.onclick = () => {
        if (currentResults && currentResults.pageText) {
          navigator.clipboard.writeText(currentResults.pageText);
          const originalText = copyTextBtn.textContent;
          copyTextBtn.textContent = "Copied Text!";
          setTimeout(() => (copyTextBtn.textContent = originalText), 1500);
        } else {
          alert("No page text available to copy.");
        }
      };
    }
  } catch (err) {
    document.getElementById("tech-results").innerHTML =
      `<div class="error">Detection Error: ${err.message || "Unknown error occurred"}</div>`;
  } finally {
    isScanning = false;
  }
}

function initAiSummaryTab() {
  const btnGenerate = document.getElementById("btn-generate-ai");
  const aiResults = document.getElementById("ai-results");
  const aiWarning = document.getElementById("ai-warning");
  const selectType = document.getElementById("ai-type");
  const selectLength = document.getElementById("ai-length");

  if (!btnGenerate) return;

  btnGenerate.onclick = async () => {
    if (!currentResults || !currentResults.pageText) {
      aiResults.innerHTML = '<div class="error">No page content found to summarize. Please scan a valid page first.</div>';
      return;
    }

    const textToSummarize = currentResults.pageText.trim();
    if (textToSummarize.length < 50) {
      aiResults.innerHTML = '<div class="error">Content is too short to summarize (minimum 50 characters).</div>';
      return;
    }

    // Clear warning and show loading
    aiWarning.classList.add("hidden");
    btnGenerate.disabled = true;
    btnGenerate.innerHTML = 'Summarizing...';
    aiResults.className = "results-container ai-output-container loading-state";
    aiResults.innerHTML = `
      <div class="spinner" style="margin-bottom:10px;"></div>
      <div style="font-weight:600;margin-bottom:4px;">Local AI working...</div>
      <div style="font-size:10px;color:#737373;">Gemini Nano generating summary</div>
    `;

    try {
      const type = selectType.value;
      const lengthVal = selectLength.value;

      // 1. Check API availability
      const availability = await checkAiSummarizerAvailability();
      if (availability === 'unavailable') {
        showAiAvailabilityError();
        return;
      }

      // Check if text is too long (Warn but proceed)
      const MAX_MODEL_CHARS = 4000;
      if (textToSummarize.length > MAX_MODEL_CHARS) {
        aiWarning.innerHTML = `
          <strong>Warning:</strong> Page text has ${textToSummarize.length} characters (exceeds recommended ~4000 character limit). 
          Summary details might be truncated.
        `;
        aiWarning.classList.remove("hidden");
      }

      // 2. Create Summarizer Session
      const options = {
        sharedContext: 'this is a website content dump',
        type: type,
        format: 'markdown',
        length: lengthVal
      };

      let summarizer;
      const hasStandardAI = typeof window.ai !== 'undefined' && typeof window.ai.summarizer !== 'undefined';
      const hasLegacyAI = typeof window.Summarizer !== 'undefined';

      if (hasStandardAI) {
        summarizer = await window.ai.summarizer.create(options);
      } else if (hasLegacyAI) {
        summarizer = await window.Summarizer.create(options);
      } else {
        throw new Error("Summarizer API interface not found.");
      }

      // 3. Summarize
      const rawSummary = await summarizer.summarize(textToSummarize);
      
      // Clean up session
      if (summarizer.destroy) {
        summarizer.destroy();
      }

      // 4. Render output
      aiResults.className = "results-container ai-output-container";
      aiResults.innerHTML = renderMarkdown(rawSummary);
    } catch (e) {
      console.error("AI Summary generation failed:", e);
      aiResults.className = "results-container ai-output-container";
      aiResults.innerHTML = `<div class="error">AI Generation Failed: ${e.message || "Unknown error"}</div>`;
    } finally {
      btnGenerate.disabled = false;
      btnGenerate.innerHTML = 'Generate AI Summary';
    }
  };
}

async function checkAiSummarizerAvailability() {
  try {
    const hasStandardAI = typeof window.ai !== 'undefined' && typeof window.ai.summarizer !== 'undefined';
    if (hasStandardAI) {
      const capabilities = await window.ai.summarizer.capabilities();
      if (capabilities && capabilities.available !== 'no') {
        return 'available';
      }
    }
    const hasLegacyAI = typeof window.Summarizer !== 'undefined';
    if (hasLegacyAI && typeof window.Summarizer.availability === 'function') {
      const status = await window.Summarizer.availability();
      if (status !== 'unavailable') {
        return 'available';
      }
    }
  } catch (e) {
    console.warn("Error checking availability:", e);
  }
  return 'unavailable';
}

function showAiAvailabilityError() {
  const aiResults = document.getElementById("ai-results");
  aiResults.className = "results-container ai-output-container";
  aiResults.innerHTML = `
    <div class="warning-card">
      <div style="font-weight:800;font-size:13px;margin-bottom:6px;color:#991b1b;">Gemini Nano Model Unavailable</div>
      <p style="margin:0 0 8px 0;font-size:11.5px;color:#7f1d1d;line-height:1.4;">
        StackRay requires Google Chrome's built-in local AI model. Please follow these steps to enable it:
      </p>
      <ol style="margin:0;padding-left:18px;font-size:11px;color:#7f1d1d;line-height:1.5;">
        <li style="margin-bottom:4px;">Enable <strong>Optimization Guide On-Device Model</strong> in <a href="chrome://flags/#optimization-guide-on-device-model" target="_blank" style="color:#7f1d1d;font-weight:700;text-decoration:underline;">chrome://flags</a> (set to "Enabled BypassPerfRequirement").</li>
        <li style="margin-bottom:4px;">Enable <strong>Prompt API for Gemini Nano</strong> in <a href="chrome://flags/#prompt-api-for-gemini-nano" target="_blank" style="color:#7f1d1d;font-weight:700;text-decoration:underline;">chrome://flags</a> (set to "Enabled").</li>
        <li style="margin-bottom:4px;">Relaunch Chrome and wait a few minutes for the model components to download in the background (verify download progress in <code>chrome://components</code> under "Optimization Guide On-Device Model").</li>
      </ol>
    </div>
  `;
}

function renderMarkdown(md) {
  if (!md) return "";
  const lines = md.split('\n');
  let html = '';
  let inList = false;

  for (let line of lines) {
    line = line.trim();
    if (!line) {
      if (inList) {
        html += '</ul>\n';
        inList = false;
      }
      continue;
    }

    // Escape HTML symbols
    line = line
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Inline formatting: Bold, Italic, Code
    line = line.replace(/(\*\*|__)(.*?)\1/g, "<strong>$2</strong>");
    line = line.replace(/(\*|_)(.*?)\1/g, "<em>$2</em>");
    line = line.replace(/`(.*?)`/g, "<code>$1</code>");

    // Headings
    if (line.startsWith('### ')) {
      if (inList) { html += '</ul>\n'; inList = false; }
      html += `<h3>${line.substring(4)}</h3>\n`;
    } else if (line.startsWith('## ')) {
      if (inList) { html += '</ul>\n'; inList = false; }
      html += `<h2>${line.substring(3)}</h2>\n`;
    } else if (line.startsWith('# ')) {
      if (inList) { html += '</ul>\n'; inList = false; }
      html += `<h1>${line.substring(2)}</h1>\n`;
    }
    // Lists
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        html += '<ul>\n';
        inList = true;
      }
      html += `<li>${line.substring(2)}</li>\n`;
    } else {
      if (inList) {
        html += '</ul>\n';
        inList = false;
      }
      html += `<p>${line}</p>\n`;
    }
  }

  if (inList) {
    html += '</ul>\n';
  }

  return html;
}

// ── DESIGN INSPECTOR LOGIC ─────────────────────
let isInspectorActive = false;

function initDesignInspector() {
  const btnInspect = document.getElementById("btn-inspect-design");
  if (!btnInspect) return;

  btnInspect.onclick = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tab) return;

      if (!isInspectorActive) {
        chrome.tabs.sendMessage(tab.id, { action: 'ENABLE_INSPECTOR' }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("Inspector load error:", chrome.runtime.lastError.message);
            alert("Could not load inspector. Try reloading the web page first.");
            return;
          }
          if (response && response.success) {
            isInspectorActive = true;
            btnInspect.classList.add("active");
            btnInspect.querySelector("span").textContent = "Disable Design Inspector";
          }
        });
      } else {
        chrome.tabs.sendMessage(tab.id, { action: 'DISABLE_INSPECTOR' }, (response) => {
          isInspectorActive = false;
          btnInspect.classList.remove("active");
          btnInspect.querySelector("span").textContent = "Inspect Page Elements";
        });
      }
    } catch (e) {
      console.error("Inspector toggle failed:", e);
    }
  };
}

function disableInspectorState() {
  isInspectorActive = false;
  const btnInspect = document.getElementById("btn-inspect-design");
  if (btnInspect) {
    btnInspect.classList.remove("active");
    const span = btnInspect.querySelector("span");
    if (span) span.textContent = "Inspect Page Elements";
  }
}

// ── LIVE CONSOLE TERMINAL LOGIC ────────────────
let terminalLogs = [];

function initConsoleTerminal() {
  const filters = document.querySelectorAll(".filter-btn");
  filters.forEach(btn => {
    btn.onclick = () => {
      filters.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const level = btn.getAttribute("data-level");
      filterTerminalLines(level);
    };
  });
}

function filterTerminalLines(level) {
  const lines = document.querySelectorAll("#console-terminal .terminal-line");
  lines.forEach(line => {
    if (line.classList.contains("system-line")) {
      line.style.display = "block";
      return;
    }
    if (level === "all") {
      line.style.display = "block";
    } else if (level === "log" && line.classList.contains("log-line")) {
      line.style.display = "block";
    } else if (level === "warn" && line.classList.contains("warn-line")) {
      line.style.display = "block";
    } else if (level === "error" && line.classList.contains("error-line")) {
      line.style.display = "block";
    } else {
      line.style.display = "none";
    }
  });
}

function appendTerminalLine(log) {
  const terminal = document.getElementById("console-terminal");
  if (!terminal) return;

  const systemLine = terminal.querySelector(".system-line");
  if (systemLine && terminalLogs.length === 0) {
    systemLine.remove();
  }

  terminalLogs.push(log);
  if (terminalLogs.length > 100) {
    terminalLogs.shift();
  }

  const line = document.createElement("div");
  line.className = `terminal-line ${log.type}-line`;
  line.textContent = `[${log.time}] [${log.type.toUpperCase()}] ${log.text}`;
  
  const activeFilterBtn = document.querySelector(".filter-btn.active");
  const currentFilter = activeFilterBtn ? activeFilterBtn.getAttribute("data-level") : "all";
  if (currentFilter !== "all" && currentFilter !== log.type) {
    line.style.display = "none";
  }

  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function resetConsoleTerminal() {
  terminalLogs = [];
  const terminal = document.getElementById("console-terminal");
  if (terminal) {
    terminal.innerHTML = `<div class="terminal-line system-line">[System] Listening for live page logs...</div>`;
  }
}

// ── SOCIAL PREVIEW SIMULATOR ───────────────────
function renderSocialPreviews(seo, hostname) {
  const googlePath = document.getElementById("google-path");
  const googleTitle = document.getElementById("google-title");
  const googleDesc = document.getElementById("google-desc");
  if (googlePath) googlePath.textContent = `https://${hostname} › search`;
  if (googleTitle) googleTitle.textContent = seo.title || "Untitled Page";
  if (googleDesc) googleDesc.textContent = seo.description || "No description set for this page.";

  const linkedinDomain = document.getElementById("linkedin-domain");
  const linkedinTitle = document.getElementById("linkedin-title");
  const linkedinImg = document.getElementById("linkedin-img");
  const linkedinPlaceholder = document.getElementById("linkedin-img-placeholder");
  if (linkedinDomain) linkedinDomain.textContent = hostname;
  if (linkedinTitle) linkedinTitle.textContent = seo.ogTitle || seo.title || "Shared Post Title";
  
  if (seo.ogImage && linkedinImg) {
    linkedinImg.src = seo.ogImage;
    linkedinImg.classList.remove("hidden");
    if (linkedinPlaceholder) linkedinPlaceholder.classList.add("hidden");
  } else if (linkedinImg) {
    linkedinImg.classList.add("hidden");
    if (linkedinPlaceholder) linkedinPlaceholder.classList.remove("hidden");
  }

  const twitterDomain = document.getElementById("twitter-domain");
  const twitterTitle = document.getElementById("twitter-title");
  const twitterDesc = document.getElementById("twitter-desc");
  const twitterImg = document.getElementById("twitter-img");
  const twitterPlaceholder = document.getElementById("twitter-img-placeholder");
  if (twitterDomain) twitterDomain.textContent = hostname;
  if (twitterTitle) twitterTitle.textContent = seo.twitterTitle || seo.ogTitle || seo.title || "Twitter Shared Card";
  if (twitterDesc) twitterDesc.textContent = seo.twitterDesc || seo.description || "No description available.";
  
  if (seo.twitterImage && twitterImg) {
    twitterImg.src = seo.twitterImage;
    twitterImg.classList.remove("hidden");
    if (twitterPlaceholder) twitterPlaceholder.classList.add("hidden");
  } else if (seo.ogImage && twitterImg) {
    twitterImg.src = seo.ogImage;
    twitterImg.classList.remove("hidden");
    if (twitterPlaceholder) twitterPlaceholder.classList.add("hidden");
  } else if (twitterImg) {
    twitterImg.classList.add("hidden");
    if (twitterPlaceholder) twitterPlaceholder.classList.remove("hidden");
  }
}

// ── NAVIGATION TIMING WATERFALL ────────────────
function renderWaterfallResults(timing) {
  if (!timing) return;

  const steps = [
    { id: "dns", value: timing.dns, label: "DNS Lookup" },
    { id: "tcp", value: timing.tcp, label: "TCP Connect" },
    { id: "ttfb", value: timing.ttfb, label: "TTFB (Server)" },
    { id: "download", value: timing.download, label: "Download HTML" },
    { id: "dom", value: timing.domInteractive, label: "DOM Interactive" },
    { id: "load", value: timing.domContentLoaded, label: "DOMContentLoaded" }
  ];

  const totalTime = timing.total || 1000;

  steps.forEach(step => {
    const row = document.getElementById(`wf-${step.id}`);
    if (!row) return;

    const bar = row.querySelector(".wf-bar");
    const valEl = row.querySelector(".wf-value");
    
    valEl.textContent = `${Math.round(step.value)}ms`;

    const percent = Math.min(100, Math.max(3, (step.value / totalTime) * 100));
    bar.style.width = `${percent}%`;

    let speedClass = "bar-good";
    if (step.id === "ttfb") {
      if (step.value > 600) speedClass = "bar-poor";
      else if (step.value > 200) speedClass = "bar-warn";
    } else {
      if (step.value > 500) speedClass = "bar-poor";
      else if (step.value > 150) speedClass = "bar-warn";
    }
    bar.className = `wf-bar ${speedClass}`;
  });
}

async function detectTechnologies() {
  return new Promise(async (resolve) => {
    const result = { tech: {}, perf: {}, a11y: {} };

    try {
      // --- 1. SMART TECH DETECTION (Priority) ---
      let tech = {};

      if (window.TechDetector) {
        try {
          const detector = new window.TechDetector();
          tech = detector.detect(document.documentElement.innerHTML);
        } catch (e) {
          console.error("TechDetector failed:", e);
        }
      }

      // --- 2. LEGACY / FALLBACK CHECKS (Refined) ---
      // These are specific checks that might not be in the regex/global patterns yet
      const allElements = Array.from(document.querySelectorAll("*"));
      const elementsToScan = allElements.slice(0, 500);

      let hasReactFiber = false;
      for (const el of elementsToScan) {
        if (!hasReactFiber) {
          try {
            for (const key of Object.keys(el)) {
              if (
                key.startsWith("__reactFiber") ||
                key.startsWith("__reactProps")
              ) {
                hasReactFiber = true;
                break;
              }
            }
          } catch (e) {}
        }
        if (hasReactFiber) break;
      }

      if (hasReactFiber && !tech.React) {
        tech.React = { detected: true, category: "Frontend Frameworks" };
      }

      result.tech = tech;

      // --- 2. ACCESSIBILITY OVERVIEW ---
      const a11y = result.a11y;
      const images = Array.from(document.querySelectorAll("img"));
      a11y.imagesTotal = images.length;
      a11y.imagesExempt = images.filter(
        (img) =>
          img.getAttribute("role") === "presentation" ||
          img.getAttribute("role") === "none",
      ).length;
      a11y.imagesMissingAlt = images.filter(
        (img) =>
          !img.hasAttribute("alt") &&
          img.getAttribute("role") !== "presentation" &&
          img.getAttribute("role") !== "none",
      ).length;
      a11y.imagesEmptyAlt = images.filter(
        (img) =>
          img.hasAttribute("alt") &&
          img.getAttribute("alt").trim() === "" &&
          img.getAttribute("role") !== "presentation",
      ).length;

      a11y.hasMain = !!document.querySelector("main");
      a11y.hasHeader = !!document.querySelector("header");
      a11y.hasNav = !!document.querySelector("nav");
      a11y.hasFooter = !!document.querySelector("footer");
      a11y.hasH1 = !!document.querySelector("h1");

      const buttons = Array.from(
        document.querySelectorAll('button:not([type="hidden"])'),
      );
      a11y.buttonsTotal = buttons.length;
      a11y.buttonsUnlabeled = buttons.filter(
        (b) =>
          b.textContent.trim() === "" &&
          !b.getAttribute("aria-label") &&
          !b.getAttribute("aria-labelledby") &&
          !b.title &&
          !b.hasAttribute("aria-hidden"),
      ).length;

      const links = Array.from(document.querySelectorAll("a"));
      a11y.linksTotal = links.length;
      a11y.linksUnlabeled = links.filter(
        (a) =>
          a.textContent.trim() === "" &&
          !a.getAttribute("aria-label") &&
          !a.getAttribute("aria-labelledby") &&
          !a.hasAttribute("title") &&
          !a.hasAttribute("aria-hidden"),
      ).length;

      const inputs = Array.from(
        document.querySelectorAll(
          'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="image"])',
        ),
      );
      a11y.inputsTotal = inputs.length;
      a11y.inputsMissingLabel = inputs.filter((input) => {
        if (
          input.hasAttribute("aria-label") ||
          input.hasAttribute("aria-labelledby") ||
          input.hasAttribute("title") ||
          input.closest("label")
        )
          return false;
        if (input.id && document.querySelector(`label[for="${input.id}"]`))
          return false;
        return true;
      }).length;

      // --- 3. PERFORMANCE / CWV (Buffered) ---
      const perf = result.perf;
      perf.CLS = 0;
      perf.FCP = null;
      perf.LCP = null;

      performance.getEntriesByType("paint").forEach((entry) => {
        if (entry.name === "first-contentful-paint") perf.FCP = entry.startTime;
      });

      let lcpObserver, clsObserver;
      try {
        lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          if (entries.length > 0)
            perf.LCP = entries[entries.length - 1].startTime;
        });
        lcpObserver.observe({
          type: "largest-contentful-paint",
          buffered: true,
        });
      } catch (e) {}

      try {
        clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) perf.CLS += entry.value;
          }
        });
        clsObserver.observe({ type: "layout-shift", buffered: true });
      } catch (e) {}

      // --- 4. MICRO-LEAD GEN & CONTACT FINDER ---
      const leads = (result.leads = {
        emails: [],
        phones: [],
        socials: [],
        contactPages: [],
      });

      // Extract emails from mailto: links
      document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
        const email = a.href.replace("mailto:", "").split("?")[0].trim();
        if (email && !leads.emails.includes(email)) leads.emails.push(email);
      });

      // Extract phones from tel: links
      document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
        const phone = a.href.replace("tel:", "").trim();
        if (phone && !leads.phones.includes(phone)) leads.phones.push(phone);
      });

      // Extract social footprints and contact pages
      const socialDomains = [
        "linkedin.com/company",
        "linkedin.com/in",
        "twitter.com",
        "x.com",
        "github.com",
        "facebook.com",
        "instagram.com",
        "youtube.com",
      ];
      Array.from(document.querySelectorAll("a[href]")).forEach((a) => {
        const href = a.href;
        if (
          socialDomains.some((d) => href.includes(d)) &&
          !leads.socials.includes(href)
        ) {
          leads.socials.push(href);
        }

        const text = a.textContent.toLowerCase();
        if (
          (href.includes("/contact") ||
            href.includes("/about") ||
            text.includes("contact us") ||
            text.includes("get in touch")) &&
          href.startsWith("http")
        ) {
          if (
            !leads.contactPages.includes(href) &&
            leads.contactPages.length < 5
          ) {
            leads.contactPages.push(href);
          }
        }
      });

      // Fallback Email Regex (aggressive scan of text content)
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
      const textMatch = document.body.innerText.match(emailRegex);
      if (textMatch) {
        textMatch.forEach((email) => {
          const cleanEmail = email.toLowerCase();
          if (
            !cleanEmail.endsWith(".png") &&
            !cleanEmail.endsWith(".jpg") &&
            !cleanEmail.endsWith(".jpeg") &&
            !cleanEmail.endsWith(".gif") &&
            !cleanEmail.endsWith(".webp") &&
            !leads.emails.includes(cleanEmail)
          ) {
            leads.emails.push(cleanEmail);
          }
        });
      }

      // --- 5. NETWORK & SECURITY INTENT ---
      const net = (result.net = { errors: 0, graphqlCounts: 0, apiCounts: 0 });
      try {
        const netSource = window._stackXRay_Net || window._stackXRay_IsolatedNet;
        if (netSource) {
          net.errors = netSource.errors || 0;
          const reqs = netSource.requests || [];
          net.graphqlCounts = reqs.filter(
            (r) => r.isGraphQL || (r.url && r.url.includes("/graphql")),
          ).length;
          net.apiCounts = reqs.length;
        }
      } catch (e) {}

      // --- 6. DEEP LIBRARY SCAN (PACKAGE.JSON & CDN) ---
      const deepLibs = new Set();
      try {
        // 6.1 Scan script tags for CDN modules
        Array.from(document.querySelectorAll("script[src]")).forEach(
          (script) => {
            const src = script.src.toLowerCase();
            const unpkgMatch = src.match(/unpkg\.com\/([^@\/]+)/);
            if (unpkgMatch) deepLibs.add(unpkgMatch[1]);

            const cdnjsMatch = src.match(
              /cdnjs\.cloudflare\.com\/ajax\/libs\/([^\/]+)/,
            );
            if (cdnjsMatch) deepLibs.add(cdnjsMatch[1]);

            const jsdelivrMatch = src.match(
              /cdn\.jsdelivr\.net\/npm\/([^@\/]+)/,
            );
            if (jsdelivrMatch) deepLibs.add(jsdelivrMatch[1]);
          },
        );

        // 6.2 Check exposed window utilities
        if (window["_"] && window["_"].VERSION) deepLibs.add("lodash");
        if (window.moment) deepLibs.add("moment.js");
        if (window.axios) deepLibs.add("axios");
        if (window.d3) deepLibs.add("d3.js");
        if (window.Chart) deepLibs.add("chart.js");
        if (window.$ && window.$.fn && window.$.fn.jquery)
          deepLibs.add("jquery");
      } catch (e) {}

      // 6.3 Attempt to hunt down a public package.json
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout so popup doesn't hang
        const pkgRes = await fetch(window.location.origin + "/package.json", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const contentType = pkgRes.headers.get("content-type");
        if (
          pkgRes.ok &&
          contentType &&
          contentType.includes("application/json")
        ) {
          const pkg = await pkgRes.json();
          if (pkg.dependencies)
            Object.keys(pkg.dependencies).forEach((d) => deepLibs.add(d));
          if (pkg.devDependencies)
            Object.keys(pkg.devDependencies).forEach((d) => deepLibs.add(d));
          deepLibs.add("💡 Detected public package.json!");
        }
      } catch (e) {}

      result.deepLibs = Array.from(deepLibs).sort();

      // --- 7. HTTP HEADERS (HOSTING & BACKEND) ---
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        const pageRes = await fetch(window.location.href, {
          method: "HEAD",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const server = pageRes.headers.get("server") || "";
        const xPoweredBy = pageRes.headers.get("x-powered-by") || "";
        const cfRay = pageRes.headers.get("cf-ray");
        const xVercelId = pageRes.headers.get("x-vercel-id");
        const xNfRequestId = pageRes.headers.get("x-nf-request-id");
        const xAmzCfId = pageRes.headers.get("x-amz-cf-id");

        const addHeaderTech = (name) => {
          if (!tech[name]) {
            let cat = "Hosting & Infrastructure";
            if (window.CATEGORIES) {
              for (const c of window.CATEGORIES) {
                if (c.keys.includes(name)) {
                  cat = c.name;
                  break;
                }
              }
            }
            tech[name] = { detected: true, category: cat };
          }
        };

        if (server.toLowerCase().includes("cloudflare") || cfRay)
          addHeaderTech("Cloudflare");
        if (server.toLowerCase().includes("nginx")) addHeaderTech("Nginx");
        if (server.toLowerCase().includes("apache")) addHeaderTech("Apache");
        if (xVercelId) addHeaderTech("Vercel");
        if (xNfRequestId) addHeaderTech("Netlify");
        if (xAmzCfId) addHeaderTech("AWS");

        if (xPoweredBy.toLowerCase().includes("express"))
          addHeaderTech("Express");
        if (xPoweredBy.toLowerCase().includes("php")) addHeaderTech("PHP");
        if (xPoweredBy.toLowerCase().includes("next.js"))
          addHeaderTech("NextJS");
        if (xPoweredBy.toLowerCase().includes("sails"))
          addHeaderTech("SailsJS");
        if (xPoweredBy.toLowerCase().includes("asp.net"))
          addHeaderTech("ASP_NET");
      } catch (e) {}

      // --- 8. SEO SEARCHER ---
      const seo = (result.seo = {});
      try {
        seo.title = document.title;
        const metaDesc =
          document.querySelector('meta[name="description"]') ||
          document.querySelector('meta[property="og:description"]');
        seo.description = metaDesc ? metaDesc.getAttribute("content") : null;

        const canonical = document.querySelector('link[rel="canonical"]');
        seo.canonical = canonical ? canonical.getAttribute("href") : null;

        seo.h1Count = document.querySelectorAll("h1").length;
        seo.ogTags = document.querySelectorAll('meta[property^="og:"]').length;
        
        // Extract social previews meta
        seo.ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content") || null;
        seo.ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content") || null;
        seo.twitterImage = document.querySelector('meta[name="twitter:image"]')?.getAttribute("content") || 
                            document.querySelector('meta[property="twitter:image"]')?.getAttribute("content") || null;
        seo.twitterTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute("content") || 
                            document.querySelector('meta[property="twitter:title"]')?.getAttribute("content") || null;
        seo.twitterDesc = document.querySelector('meta[name="twitter:description"]')?.getAttribute("content") || 
                           document.querySelector('meta[property="twitter:description"]')?.getAttribute("content") || null;
      } catch (e) {}

      // --- 9. DESIGN EXTRACTION ---
      const design = (result.design = {
        fonts: {},
        colors: {},
        borderRadius: {},
        paddings: {},
        margins: {},
      });
      try {
        const rgbToHex = (color) => {
          if (!color) return color;
          color = color.trim();
          if (color.startsWith('#')) return color;
          const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
          if (!rgbMatch) return color;
          const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
          const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
          const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
          return `#${r}${g}${b}`;
        };

        const elements = Array.from(document.querySelectorAll("*"));
        const total = elements.length;
        const maxEls = 400;
        const step = Math.max(1, Math.floor(total / maxEls));
        for (let i = 0; i < total; i += step) {
          const el = elements[i];
          const style = window.getComputedStyle(el);
          if (style.display === "none") continue;

          // Colors (Normalized to HEX)
          if (
            style.backgroundColor &&
            style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
            style.backgroundColor !== "transparent"
          ) {
            const hexColor = rgbToHex(style.backgroundColor);
            design.colors[hexColor] = (design.colors[hexColor] || 0) + 1;
          }
          if (style.color && style.color !== "rgba(0, 0, 0, 0)" && style.color !== "transparent") {
            const hexColor = rgbToHex(style.color);
            design.colors[hexColor] = (design.colors[hexColor] || 0) + 1;
          }

          // Typography
          const font = style.fontFamily.split(",")[0].replace(/['"]/g, "");
          if (font) design.fonts[font] = (design.fonts[font] || 0) + 1;

          // Border Radius
          if (style.borderRadius && style.borderRadius !== "0px") {
            design.borderRadius[style.borderRadius] =
              (design.borderRadius[style.borderRadius] || 0) + 1;
          }

          // Paddings
          if (style.padding && style.padding !== "0px") {
            design.paddings[style.padding] =
              (design.paddings[style.padding] || 0) + 1;
          }

          // Margins
          if (style.margin && style.margin !== "0px") {
            design.margins[style.margin] =
              (design.margins[style.margin] || 0) + 1;
          }
        }
      } catch (e) {}

      // --- 10. TEXT EXTRACTION ---
      try {
        result.pageText = document.body.innerText;
      } catch (e) {}

      // --- 11. KEYWORDS & SEO ENHANCEMENT ---
      const keywords = (result.keywords = {
        meta: "",
        density: [],
        headings: [],
        robots: { exists: false, status: 0 },
        sitemap: { exists: false, status: 0 }
      });
      try {
        // Meta keywords
        const metaKeyEl = document.querySelector('meta[name="keywords"]');
        if (metaKeyEl) keywords.meta = metaKeyEl.getAttribute("content") || "";

        // Keyword Density
        const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", "by", "of", "about", "as", "is", "are", "was", "were", "be", "been", "have", "has", "had", "this", "that", "these", "those", "it", "its", "they", "them", "their", "from", "into", "will", "would", "can", "could", "should", "your", "my", "our", "you", "i", "we", "he", "she", "us"]);
        const words = (document.body.innerText || "")
          .toLowerCase()
          .replace(/[^\w\s-]/g, " ")
          .split(/\s+/);
        
        const wordCounts = {};
        let validWordCount = 0;
        for (const w of words) {
          const cleanW = w.trim();
          if (cleanW && cleanW.length > 2 && !stopWords.has(cleanW) && !/^\d+$/.test(cleanW)) {
            wordCounts[cleanW] = (wordCounts[cleanW] || 0) + 1;
            validWordCount++;
          }
        }
        
        keywords.density = Object.entries(wordCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([word, count]) => ({
            word,
            count,
            density: ((count / Math.max(1, validWordCount)) * 100).toFixed(1) + "%"
          }));

        // Headings Hierarchy
        document.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((el) => {
          keywords.headings.push({
            tag: el.tagName.toLowerCase(),
            text: el.textContent.trim().substring(0, 100)
          });
        });

        // Robots & Sitemap status (fetch origin metadata)
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);
          const origin = window.location.origin;
          
          const [robotsRes, sitemapRes] = await Promise.all([
            fetch(origin + "/robots.txt", { method: "HEAD", signal: controller.signal }).catch(() => null),
            fetch(origin + "/sitemap.xml", { method: "HEAD", signal: controller.signal }).catch(() => null)
          ]);
          clearTimeout(timeoutId);

          if (robotsRes) {
            keywords.robots.exists = robotsRes.ok;
            keywords.robots.status = robotsRes.status;
          }
          if (sitemapRes) {
            keywords.sitemap.exists = sitemapRes.ok;
            keywords.sitemap.status = sitemapRes.status;
          }
        } catch (err) {}
      } catch (e) {}

      // --- 12. NAVIGATION TIMING WATERFALL ---
      try {
        const timing = performance.getEntriesByType('navigation')[0];
        if (timing) {
          result.timing = {
            dns: Math.max(0, timing.domainLookupEnd - timing.domainLookupStart),
            tcp: Math.max(0, timing.connectEnd - timing.connectStart),
            ttfb: Math.max(0, timing.responseStart - timing.requestStart),
            download: Math.max(0, timing.responseEnd - timing.responseStart),
            domInteractive: Math.max(0, timing.domInteractive - timing.responseEnd),
            domContentLoaded: Math.max(0, timing.domContentLoadedEventEnd - timing.responseEnd),
            total: Math.max(1, timing.loadEventEnd || (timing.domComplete - timing.startTime))
          };
        }
      } catch (err) {}

      // Wait 100ms for buffered events to fire
      setTimeout(() => {
        if (lcpObserver) lcpObserver.disconnect();
        if (clsObserver) clsObserver.disconnect();
        resolve(result);
      }, 100);
    } catch (e) {
      result.Error = { detected: true, message: e.message };
      resolve(result);
    }
  });
}

function renderTechResults(data) {
  const tech = data.tech || data;
  const container = document.getElementById("tech-results");
  if (!container) return;
  container.innerHTML = "";

  // Dynamic Grouping based on category from categories.js
  const groups = {};
  Object.entries(tech).forEach(([name, data]) => {
    if (data.detected) {
      const cat = data.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ name, version: data.version });
    }
  });

  if (Object.keys(groups).length === 0) {
    container.innerHTML =
      '<div class="no-results">No technologies detected</div>';
    return;
  }

  // Sort categories by priority
  const catPriority = [
    "Frontend Frameworks",
    "Meta Frameworks",
    "Programming Languages",
    "CMS & Platforms",
    "E-Commerce",
    "UI & CSS Frameworks",
    "Analytics & Tracking",
    "Marketing & Ads",
    "JavaScript Libraries",
    "Animation & Motion",
    "Hosting & Infrastructure",
    "JavaScript",
  ];

  const sortedCats = Object.keys(groups).sort((a, b) => {
    let indexA = catPriority.indexOf(a);
    let indexB = catPriority.indexOf(b);
    if (indexA === -1) indexA = 999;
    if (indexB === -1) indexB = 999;
    return indexA - indexB;
  });

  sortedCats.forEach((cat) => {
    const section = document.createElement("div");
    section.className = "tech-section";

    const header = document.createElement("div");
    header.className = "category-header";
    header.textContent = cat;
    section.appendChild(header);

    const list = document.createElement("div");
    list.className = cat === "JavaScript" ? "js-tag-cloud" : "tech-list";

    groups[cat].forEach((item, index) => {
      if (cat === "JavaScript") {
        const tag = document.createElement("span");
        tag.className = "js-tag";
        tag.textContent = item.name;
        tag.style.animation = "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards";
        tag.style.animationDelay = `${index * 0.02}s`;
        tag.style.opacity = "0";
        list.appendChild(tag);
      } else {
        const div = document.createElement("div");
        div.className = "item";
        div.style.animationDelay = `${index * 0.03}s`;
        div.innerHTML = `
          <div class="item-main">
            <span class="item-name">${item.name}</span>
            ${item.version ? `<span class="item-version">${item.version}</span>` : ""}
          </div>
          <span class="item-status">detected</span>
        `;
        list.appendChild(div);
      }
    });

    section.appendChild(list);
    container.appendChild(section);
  });

  // Handle deep libs if any
  if (data.deepLibs && data.deepLibs.length > 0) {
    const deepSection = document.createElement("div");
    deepSection.className = "tech-section";
    const deepHeader = document.createElement("div");
    deepHeader.className = "category-header";
    deepHeader.textContent = "Deep Discovery (CDN/Package)";
    deepSection.appendChild(deepHeader);

    const deepList = document.createElement("div");
    deepList.className = "js-tag-cloud";
    data.deepLibs.forEach((lib, index) => {
      const tag = document.createElement("span");
      tag.className = "js-tag secondary";
      tag.textContent = lib;
      tag.style.animation = "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards";
      tag.style.animationDelay = `${index * 0.02}s`;
      tag.style.opacity = "0";
      deepList.appendChild(tag);
    });
    deepSection.appendChild(deepList);
    container.appendChild(deepSection);
  }
}

function renderPerfResults(perf) {
  const metrics = [
    {
      id: "fcp",
      label: "First Contentful Paint",
      value: perf.FCP,
      thresholds: [1800, 3000],
      unit: "ms",
    },
    {
      id: "lcp",
      label: "Largest Contentful Paint",
      value: perf.LCP,
      thresholds: [2500, 4000],
      unit: "ms",
    },
    {
      id: "cls",
      label: "Cumulative Layout Shift",
      value: perf.CLS,
      thresholds: [0.1, 0.25],
      unit: "",
    },
  ];

  metrics.forEach((m, index) => {
    const card = document.getElementById(`metric-${m.id}`);
    if (!card) return;
    card.style.animationDelay = `${index * 0.05}s`;

    let status = "good";
    let statusText = "Good";
    if (m.value === null || m.value === undefined) {
      statusText = "Pending";
      status = "pending";
    } else if (m.value > m.thresholds[1]) {
      status = "poor";
      statusText = "Poor";
    } else if (m.value > m.thresholds[0]) {
      status = "needs-improvement";
      statusText = "Needs Improvement";
    }

    const valueEl = card.querySelector(".metric-value");
    const barEl = card.querySelector(".metric-bar");
    const statusEl = card.querySelector(".metric-status");

    if (m.value !== null && m.value !== undefined) {
      valueEl.textContent =
        m.id === "cls" ? m.value.toFixed(3) : `${Math.round(m.value)}${m.unit}`;
      const maxVal = m.thresholds[1] * 1.5;
      const percentage = Math.min(100, (m.value / maxVal) * 100);
      barEl.style.width = `${percentage}%`;
      barEl.className = `metric-bar bar-${status}`;
      statusEl.textContent = statusText;
      statusEl.className = `metric-status status-${status}`;
    } else {
      valueEl.textContent = "--";
      statusEl.textContent = "Scanning...";
    }
  });

  const container = document.getElementById("perf-results");
  if (!container) return;
  container.innerHTML =
    '<div class="category-header">Performance Overview</div>';

  metrics.forEach((m, index) => {
    if (m.value !== null && m.value !== undefined) {
      const item = document.createElement("div");
      item.className = "item";
      item.style.animationDelay = `${(index + 3) * 0.04}s`;
      item.innerHTML = `
        <span class="item-name">${m.label}</span>
        <span class="item-value">${m.id === "cls" ? m.value.toFixed(4) : (m.value / 1000).toFixed(2) + "s"}</span>
      `;
      container.appendChild(item);
    }
  });
}

function renderA11yResults(a11y) {
  const container = document.getElementById("a11y-results");
  container.innerHTML = "";

  const getColor = (pass) => (pass ? "#22c55e" : "#ef4444");
  const missingColor = (count) => (count === 0 ? "#22c55e" : "#ef4444");

  container.innerHTML = `
        <div class="category-header">Images & Media</div>
        <div class="item">
            <span class="item-name">Total Images</span>
            <span class="item-value">${a11y.imagesTotal}</span>
        </div>
        <div class="item">
            <span class="item-name" style="color: #cbd5e1">⚠️ Missing Alt Attribute</span>
            <span class="item-value" style="color: ${missingColor(a11y.imagesMissingAlt)}; font-weight: bold;">
                ${a11y.imagesMissingAlt}
            </span>
        </div>
        <div class="item">
            <span class="item-name" style="color: #cbd5e1">✅ Empty Alt (Decorative)</span>
            <span class="item-value">${a11y.imagesEmptyAlt}</span>
        </div>
        <div class="item">
            <span class="item-name" style="color: #cbd5e1">🎭 ARIA Exempt (Presentation)</span>
            <span class="item-value">${a11y.imagesExempt}</span>
        </div>

        <div class="category-header">Interactive Elements & Forms</div>
        <div class="item">
            <span class="item-name" style="color: #cbd5e1">Unlabeled Links</span>
            <span class="item-value" style="color: ${missingColor(a11y.linksUnlabeled)}; font-weight: bold;">
                ${a11y.linksUnlabeled} / ${a11y.linksTotal}
            </span>
        </div>
        <div class="item">
            <span class="item-name" style="color: #cbd5e1">Unlabeled Buttons</span>
            <span class="item-value" style="color: ${missingColor(a11y.buttonsUnlabeled)}; font-weight: bold;">
                ${a11y.buttonsUnlabeled} / ${a11y.buttonsTotal}
            </span>
        </div>
        <div class="item">
            <span class="item-name" style="color: #cbd5e1">Inputs Missing Labels</span>
            <span class="item-value" style="color: ${missingColor(a11y.inputsMissingLabel)}; font-weight: bold;">
                ${a11y.inputsMissingLabel} / ${a11y.inputsTotal}
            </span>
        </div>

        <div class="category-header">Semantic Structure</div>
        <div class="item">
            <span class="item-name">&lt;main&gt; Landmark</span>
            <span class="item-value" style="color: ${getColor(a11y.hasMain)}; font-weight: bold;">
                ${a11y.hasMain ? "✅ Present" : "❌ Missing"}
            </span>
        </div>
        <div class="item">
            <span class="item-name">H1 Heading</span>
            <span class="item-value" style="color: ${getColor(a11y.hasH1)}; font-weight: bold;">
                ${a11y.hasH1 ? "✅ Present" : "❌ Missing"}
            </span>
        </div>
        <div class="item">
            <span class="item-name">&lt;header&gt; & &lt;footer&gt;</span>
            <span class="item-value" style="color: ${getColor(a11y.hasHeader && a11y.hasFooter)}; font-weight: bold;">
                ${a11y.hasHeader && a11y.hasFooter ? "✅ Present" : a11y.hasHeader || a11y.hasFooter ? "⚠️ Partial" : "❌ Missing"}
            </span>
        </div>
    `;
}

function renderLeadsResults(leads) {
  const container = document.getElementById("leads-results");
  container.innerHTML = "";

  const renderList = (title, items, isLink) => {
    if (!items || items.length === 0) return "";
    let listHtml = items
      .map((item, index) => {
        let href = isLink ? item : "";
        if (title.includes("Email")) href = `mailto:${item}`;
        if (title.includes("Phone")) href = `tel:${item}`;

        const display = item.length > 50 ? item.substring(0, 47) + "..." : item;

        // Format Social URLs beautifully
        let formatDisplay = display;
        try {
          if (display.includes("linkedin.com"))
            formatDisplay =
              "LinkedIn: /" + display.split("linkedin.com/")[1].split("/")[0];
          if (display.includes("twitter.com"))
            formatDisplay =
              "Twitter: /" + display.split("twitter.com/")[1].split("/")[0];
          if (display.includes("github.com"))
            formatDisplay =
              "GitHub: /" + display.split("github.com/")[1].split("/")[0];
        } catch (e) {}

        const content = href
          ? `<a href="${href}" target="_blank" class="lead-link">${formatDisplay}</a>`
          : `<span class="item-value" style="color:#525252">${formatDisplay}</span>`;
        return `<div class="item" style="animation-delay: ${index * 0.03}s">${content}</div>`;
      })
      .join("");
    return `<div class="category-header">${title} (${items.length})</div>${listHtml}`;
  };

  let fullHtml = "";
  fullHtml += renderList("📧 Emails", leads.emails, true);
  fullHtml += renderList("📞 Phones", leads.phones, true);
  fullHtml += renderList("🌐 Social Footprints", leads.socials, true);
  fullHtml += renderList("🗺️ Contact Pages", leads.contactPages, true);

  if (!fullHtml) {
    container.innerHTML =
      '<div class="placeholder">No leads, social footprints, or contact pages found on this domain.</div>';
  } else {
    container.innerHTML = fullHtml;
  }
}

function renderNetResults(net) {
  const container = document.getElementById("net-results");
  container.innerHTML = "";

  const getBadge = (count, danger) => {
    if (count === 0)
      return `<span class="item-value" style="color: #a3a3a3">0</span>`;
    if (danger)
      return `<span class="item-value" style="color: #dc2626; font-weight: bold;">${count}</span>`;
    return `<span class="item-value" style="color: #171717; font-weight: bold;">${count}</span>`;
  };

  container.innerHTML = `
        <div class="category-header">API & Network Intent</div>
        <div class="item">
            <span class="item-name">Active Fetch / XHR Requests</span>
            ${getBadge(net.apiCounts, false)}
        </div>
        <div class="item">
            <span class="item-name">GraphQL Endpoints Used</span>
            ${getBadge(net.graphqlCounts, false)}
        </div>
        <div class="category-header">Console Health</div>
        <div class="item">
            <span class="item-name">JavaScript Errors Thrown</span>
            ${getBadge(net.errors, true)}
        </div>
    `;
}

function renderDesignResults(design) {
  const colorContainer = document.getElementById("design-colors");
  const fontContainer = document.getElementById("design-fonts");
  const resultsContainer = document.getElementById("design-results");

  if (colorContainer) colorContainer.innerHTML = "";
  if (fontContainer) fontContainer.innerHTML = "";
  if (resultsContainer) resultsContainer.innerHTML = "";

  // Colors
  const sortedColors = Object.entries(design.colors || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  if (sortedColors.length > 0 && colorContainer) {
    sortedColors.forEach(([color, count], index) => {
      const swatch = document.createElement("div");
      swatch.className = "color-swatch";
      swatch.style.backgroundColor = color;
      swatch.setAttribute("data-color", color);
      swatch.style.animation = "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards";
      swatch.style.animationDelay = `${index * 0.02}s`;
      swatch.style.opacity = "0";
      swatch.onclick = () => {
        navigator.clipboard.writeText(color);
        const originalColor = swatch.getAttribute("data-color");
        swatch.setAttribute("data-color", "Copied!");
        setTimeout(
          () => swatch.setAttribute("data-color", originalColor),
          1000,
        );
      };
      colorContainer.appendChild(swatch);
    });
  } else if (colorContainer) {
    colorContainer.innerHTML =
      '<div class="placeholder">No colors detected</div>';
  }

  // Fonts
  const sortedFonts = Object.entries(design.fonts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (sortedFonts.length > 0 && fontContainer) {
    sortedFonts.forEach(([font, count], index) => {
      const item = document.createElement("div");
      item.className = "font-item";
      item.style.animationDelay = `${index * 0.03}s`;
      item.innerHTML = `
        <div class="font-preview" style="font-family: '${font}', sans-serif">Abc 123</div>
        <div class="font-name">${font}</div>
      `;
      fontContainer.appendChild(item);
    });
  } else if (fontContainer) {
    fontContainer.innerHTML =
      '<div class="placeholder">No fonts detected</div>';
  }

  // Other Design Specs
  const getTop = (dict) =>
    Object.entries(dict || {}).sort((a, b) => b[1] - a[1])[0];
  const radius = getTop(design.borderRadius);
  const padding = getTop(design.paddings);
  const margin = getTop(design.margins);

  if (resultsContainer) {
    resultsContainer.innerHTML =
      '<div class="category-header">System Specs</div>';

    const addSpec = (label, value, idx) => {
      if (!value) return;
      const item = document.createElement("div");
      item.className = "item";
      item.style.animationDelay = `${idx * 0.04}s`;
      item.innerHTML = `
        <span class="item-name">${label}</span>
        <span class="item-value">${value[0]}</span>
      `;
      resultsContainer.appendChild(item);
    };

    let idx = 0;
    if (radius) addSpec("Primary Border Radius", radius, idx++);
    if (padding) addSpec("Common Padding", padding, idx++);
    if (margin) addSpec("Common Margin", margin, idx++);
  }
}

function renderSeoResults(seo) {
  const container = document.getElementById("seo-results");
  const scoreValueEl = document.getElementById("seo-score-value");
  const scoreRingEl = document.getElementById("seo-score-ring");
  if (!container) return;
  container.innerHTML = "";

  // Score Calculation
  let score = 100;
  if (!seo.title || seo.title.length < 10) score -= 20;
  if (!seo.description || seo.description.length < 50) score -= 20;
  if (seo.h1Count === 0) score -= 20;
  if (seo.h1Count > 1) score -= 10;
  if (seo.ogTags === 0) score -= 15;
  if (!seo.canonical) score -= 15;
  score = Math.max(0, score);

  if (scoreValueEl && scoreRingEl) {
    scoreValueEl.textContent = score;
    // Delay circle gauge drawing to show visual transition
    scoreRingEl.style.strokeDasharray = "226.2";
    scoreRingEl.style.strokeDashoffset = "226.2";
    setTimeout(() => {
      const offset = 226.2 - (score / 100) * 226.2;
      scoreRingEl.style.strokeDashoffset = offset;
    }, 150);
    const color = score >= 80 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";
    scoreRingEl.style.stroke = color;
    scoreValueEl.style.color = color;
  }

  // Text field cards (Title + Description)
  [
    { label: "Title", value: seo.title, min: 30, max: 60, abbr: "T" },
    { label: "Meta Description", value: seo.description, min: 70, max: 160, abbr: "D" },
  ].forEach(function({ label, value, min, max, abbr }, index) {
    const len = value ? value.length : 0;
    const hasValue = !!value && len > 0;
    let statusClass = "seo-status-missing";
    let statusText = "Missing";
    let barColor = "#ef4444";
    let barPct = 0;

    if (hasValue) {
      barPct = Math.min(100, (len / max) * 100);
      if (len > max) {
        statusClass = "seo-status-warn";
        statusText = "Too long \u00b7 " + len + "/" + max;
        barColor = "#f59e0b";
      } else if (len < min) {
        statusClass = "seo-status-warn";
        statusText = "Too short \u00b7 " + len + "/" + max;
        barColor = "#f59e0b";
      } else {
        statusClass = "seo-status-good";
        statusText = "Good \u00b7 " + len + "/" + max;
        barColor = "#22c55e";
      }
    }

    const card = document.createElement("div");
    card.className = "seo-card";
    card.style.animationDelay = `${index * 0.05}s`;
    card.innerHTML =
      '<div class="seo-card-header">' +
        '<span class="seo-card-label"><span class="seo-icon-pill">' + abbr + '</span>' + label + '</span>' +
        '<span class="seo-badge ' + statusClass + '">' + statusText + '</span>' +
      '</div>' +
      (hasValue
        ? '<div class="seo-card-value">' + value + '</div><div class="seo-char-bar-bg"><div class="seo-char-bar" style="width:' + barPct + '%;background:' + barColor + ';"></div></div>'
        : '<div class="seo-card-value seo-missing-val">Not set</div>'
      );
    container.appendChild(card);
  });

  // Quick check rows
  const checksWrap = document.createElement("div");
  checksWrap.className = "seo-checks";

  [
    {
      label: "H1 Tag", icon: "H1",
      pass: seo.h1Count === 1, warn: seo.h1Count > 1,
      detail: seo.h1Count === 0 ? "Missing" : seo.h1Count === 1 ? "1 found" : seo.h1Count + " found — use 1 only",
    },
    {
      label: "Open Graph", icon: "OG",
      pass: seo.ogTags > 0, warn: false,
      detail: seo.ogTags > 0 ? seo.ogTags + " tags found" : "None detected",
    },
    {
      label: "Canonical URL", icon: "#",
      pass: !!seo.canonical, warn: false,
      detail: seo.canonical ? seo.canonical : "Not set",
    },
  ].forEach(function({ label, icon, pass, warn, detail }, index) {
    const emoji = warn ? "\u26a0\ufe0f" : pass ? "\u2705" : "\u274c";
    const rowClass = "seo-check-row " + (warn ? "warn" : pass ? "pass" : "fail");
    const row = document.createElement("div");
    row.className = rowClass;
    row.style.animationDelay = `${(index + 2) * 0.04}s`;
    row.innerHTML =
      '<span class="seo-check-icon">' + icon + '</span>' +
      '<div class="seo-check-body"><span class="seo-check-label">' + label + '</span><span class="seo-check-detail">' + detail + '</span></div>' +
      '<span class="seo-check-dot">' + emoji + '</span>';
    checksWrap.appendChild(row);
  });
  container.appendChild(checksWrap);
}

function exportData(data, format) {
  if (!data) return;

  // Get user selections from checkboxes
  const selections = {};
  document.querySelectorAll(".export-check").forEach((cb) => {
    selections[cb.getAttribute("data-cat")] = cb.checked;
  });

  let content = "";
  let domain = "site";
  try {
    const urlText = document.getElementById("url").textContent;
    domain = (urlText.includes(".") ? urlText : "site").replace(
      /[^a-z0-9.]/gi,
      "_",
    );
  } catch (e) {
    domain = "site";
  }

  let fileName = `stackray-report-${domain}.${format}`;

  if (format === "json") {
    const filteredData = {};
    if (selections.tech)
      filteredData.tech = Object.fromEntries(
        Object.entries(data.tech || {}).filter(([_, v]) => v.detected),
      );
    if (selections.design) filteredData.design = data.design;
    if (selections.seo) filteredData.seo = data.seo;
    if (selections.keywords) filteredData.keywords = data.keywords;
    if (selections.leads) filteredData.leads = data.leads;
    if (selections.perf) filteredData.perf = data.perf;
    if (selections.net) filteredData.net = data.net;
    content = JSON.stringify(filteredData, null, 2);
  } else {
    const rows = [["Category", "Key", "Value"]];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return "";
      let s = String(val);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        s = '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    // Tech Stack (Only detected ones)
    if (selections.tech && data.tech) {
      Object.entries(data.tech)
        .filter(([_, v]) => v.detected)
        .forEach(([k, v]) => {
          rows.push(["Technology", k, v.version || "detected"]);
        });
    }

    // Performance
    if (selections.perf && data.perf) {
      if (data.perf.FCP)
        rows.push(["Performance", "FCP", `${data.perf.FCP.toFixed(2)}ms`]);
      if (data.perf.LCP)
        rows.push(["Performance", "LCP", `${data.perf.LCP.toFixed(2)}ms`]);
      if (data.perf.CLS)
        rows.push(["Performance", "CLS", data.perf.CLS.toFixed(4)]);
    }

    // Leads
    if (selections.leads && data.leads) {
      (data.leads.emails || []).forEach((e) => rows.push(["Lead", "Email", e]));
      (data.leads.phones || []).forEach((p) => rows.push(["Lead", "Phone", p]));
      (data.leads.socials || []).forEach((s) =>
        rows.push(["Social", "Profile", s]),
      );
      (data.leads.contactPages || []).forEach((cp) =>
        rows.push(["Page", "Contact", cp]),
      );
    }

    // SEO
    if (selections.seo && data.seo) {
      rows.push(["SEO", "Title", data.seo.title || ""]);
      rows.push(["SEO", "Description", data.seo.description || ""]);
      rows.push(["SEO", "H1 Count", data.seo.h1Count || 0]);
      rows.push(["SEO", "Canonical", data.seo.canonical || "None"]);
    }

    // Keywords
    if (selections.keywords && data.keywords) {
      rows.push(["Keywords", "Meta Keywords", data.keywords.meta || ""]);
      (data.keywords.density || []).forEach((kd) => {
        rows.push(["Keywords", `Density: ${kd.word}`, `${kd.count} (${kd.density})`]);
      });
      (data.keywords.headings || []).forEach((h) => {
        rows.push(["Keywords", `Heading: ${h.tag}`, h.text || ""]);
      });
      rows.push(["Keywords", "robots.txt", data.keywords.robots.exists ? "Found" : "Missing"]);
      rows.push(["Keywords", "sitemap.xml", data.keywords.sitemap.exists ? "Found" : "Missing"]);
    }

    // Design
    if (selections.design && data.design) {
      const fonts = Object.keys(data.design.fonts || {}).join("; ");
      const colors = Object.keys(data.design.colors || {}).join("; ");
      if (fonts) rows.push(["Design", "Fonts", fonts]);
      if (colors) rows.push(["Design", "Colors", colors]);

      const topRadius = Object.entries(data.design.borderRadius || {}).sort(
        (a, b) => b[1] - a[1],
      )[0];
      if (topRadius) rows.push(["Design", "Primary Radius", topRadius[0]]);
    }

    // Network
    if (selections.net && data.net) {
      rows.push(["Network", "Total Requests", data.net.apiCounts || 0]);
      rows.push(["Network", "GraphQL Requests", data.net.graphqlCounts || 0]);
      rows.push(["Network", "JS Errors", data.net.errors || 0]);
    }

    content = rows.map((row) => row.map(escapeCSV).join(",")).join("\n");
  }

  const blob = new Blob([content], {
    type: format === "json" ? "application/json" : "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function renderKeywordsResults(keywords) {
  const metaContainer = document.getElementById("kw-meta");
  const densityContainer = document.getElementById("kw-density");
  const headingsContainer = document.getElementById("kw-headings");
  const robotsContainer = document.getElementById("kw-robots");

  // 1. Meta Keywords
  if (metaContainer) {
    if (keywords.meta) {
      const tags = keywords.meta.split(",").map(k => k.trim()).filter(Boolean);
      if (tags.length > 0) {
        metaContainer.innerHTML = `<div class="keyword-cloud">` +
          tags.map(t => `<span class="keyword-tag">${t}</span>`).join("") +
          `</div>`;
      } else {
        metaContainer.innerHTML = `<div class="placeholder">No meta keywords declared</div>`;
      }
    } else {
      metaContainer.innerHTML = `<div class="placeholder">No meta keywords declared</div>`;
    }
  }

  // 2. Keyword Density
  if (densityContainer) {
    if (keywords.density && keywords.density.length > 0) {
      densityContainer.innerHTML = `<div class="keyword-cloud">` +
        keywords.density.map(kd => `<span class="keyword-tag medium">${kd.word} (${kd.density})</span>`).join("") +
        `</div>`;
      
      const copyKwBtn = document.getElementById("btn-copy-keywords");
      if (copyKwBtn) {
        copyKwBtn.onclick = () => {
          const list = keywords.density.map(kd => `${kd.word} (${kd.density})`).join(", ");
          navigator.clipboard.writeText(list);
          const originalText = copyKwBtn.textContent;
          copyKwBtn.textContent = "Copied!";
          setTimeout(() => copyKwBtn.textContent = originalText, 1500);
        };
      }
    } else {
      densityContainer.innerHTML = `<div class="placeholder">No text found to analyze</div>`;
    }
  }

  // 3. Headings Hierarchy
  if (headingsContainer) {
    if (keywords.headings && keywords.headings.length > 0) {
      headingsContainer.innerHTML = `<div class="heading-tree">` +
        keywords.headings.map(h => {
          return `<div class="heading-item ${h.tag}">
            <span class="heading-tag">${h.tag.toUpperCase()}</span>
            <span class="heading-text">${h.text || "Empty Heading"}</span>
          </div>`;
        }).join("") +
        `</div>`;
    } else {
      headingsContainer.innerHTML = `<div class="placeholder">No headings found (H1-H6)</div>`;
    }
  }

  // 4. Robots & Sitemap
  if (robotsContainer) {
    const r = keywords.robots;
    const s = keywords.sitemap;
    robotsContainer.innerHTML = `
      <div class="item">
        <span class="item-name">robots.txt</span>
        <span class="item-value" style="color: ${r.exists ? "#22c55e" : "#ef4444"}; font-weight: bold;">
          ${r.exists ? `✅ Found (${r.status})` : `❌ Missing (${r.status || 'No Response'})`}
        </span>
      </div>
      <div class="item">
        <span class="item-name">sitemap.xml</span>
        <span class="item-value" style="color: ${s.exists ? "#22c55e" : "#ef4444"}; font-weight: bold;">
          ${s.exists ? `✅ Found (${s.status})` : `❌ Missing (${s.status || 'No Response'})`}
        </span>
      </div>
    `;
  }
}

async function runDomainLookup(hostname) {
  const domainHostingEl = document.getElementById("domain-hosting");
  const domainWhoisEl = document.getElementById("domain-whois");

  try {
    if (typeof window.fetchDomainInfo !== "function") {
      throw new Error("fetchDomainInfo utility not loaded");
    }

    const res = await window.fetchDomainInfo(hostname);

    if (res.error) {
      domainHostingEl.innerHTML = `<div class="error">${res.error}</div>`;
      domainWhoisEl.innerHTML = `<div class="error">${res.error}</div>`;
      return;
    }

    // 1. Render Hosting Provider Details
    if (res.hosting && !res.hosting.error) {
      domainHostingEl.innerHTML = `
        <div class="item">
          <span class="item-name">Hosting Provider</span>
          <span class="item-value">${res.hosting.isp}</span>
        </div>
        <div class="item">
          <span class="item-name">Server Location</span>
          <span class="item-value">${res.hosting.location}</span>
        </div>
        <div class="item">
          <span class="item-name">ASN</span>
          <span class="item-value">${res.hosting.asn}</span>
        </div>
      `;
    } else {
      domainHostingEl.innerHTML = `<div class="error">${(res.hosting && res.hosting.error) || "Failed to retrieve hosting details"}</div>`;
    }

    // 2. Render WHOIS Registration Details
    if (res.whois && !res.whois.error) {
      domainWhoisEl.innerHTML = `
        <div class="item">
          <span class="item-name">Registrar</span>
          <span class="item-value">${res.whois.registrar}</span>
        </div>
        <div class="item">
          <span class="item-name">Registered Date</span>
          <span class="item-value">${res.whois.registered}</span>
        </div>
        <div class="item">
          <span class="item-name">Expiration Date</span>
          <span class="item-value">${res.whois.expires}</span>
        </div>
        <div class="item">
          <span class="item-name">Name Servers</span>
          <span class="item-value">${res.whois.nameservers}</span>
        </div>
      `;
    } else {
      domainWhoisEl.innerHTML = `<div class="error">${(res.whois && res.whois.error) || "Failed to retrieve WHOIS details"}</div>`;
    }
  } catch (err) {
    console.error("Domain lookup error:", err);
    domainHostingEl.innerHTML = '<div class="error">Failed to perform domain search.</div>';
    domainWhoisEl.innerHTML = '<div class="error">Failed to retrieve WHOIS records.</div>';
  }
}
