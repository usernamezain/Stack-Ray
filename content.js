// Check if already injected
if (!window._stackXRayLoaded) {
  window._stackXRayLoaded = true;

  // Initialize isolated world cache for fallback
  window._stackXRay_IsolatedNet = { errors: 0, requests: [], logs: [] };

  window.addEventListener('message', (event) => {
    // Only accept messages from the same page context
    if (event.source !== window) return;
    if (event.data) {
      if (event.data.type === 'STACK_XRAY_NET_REQ' && event.data.request) {
        window._stackXRay_IsolatedNet.requests.push(event.data.request);
      } else if (event.data.type === 'STACK_XRAY_NET_ERR') {
        window._stackXRay_IsolatedNet.errors++;
      } else if (event.data.type === 'STACK_XRAY_CONSOLE_LOG' && event.data.log) {
        if (!window._stackXRay_IsolatedNet.logs) {
          window._stackXRay_IsolatedNet.logs = [];
        }
        if (window._stackXRay_IsolatedNet.logs.length > 100) {
          window._stackXRay_IsolatedNet.logs.shift();
        }
        window._stackXRay_IsolatedNet.logs.push(event.data.log);
        
        // Send console log to popup in real-time
        try {
          chrome.runtime.sendMessage({ action: 'CONSOLE_STREAM_LOG', log: event.data.log }).catch(() => {});
        } catch(e) {}
      }
    }
  });



  // --- DESIGN INSPECTOR OVERLAY ---
  let inspectorActive = false;
  let hoveredElement = null;
  let tooltipEl = null;

  function rgbToHex(color) {
    if (!color) return "";
    color = color.trim();
    if (color.startsWith('#')) return color;
    const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
    if (!rgbMatch) return color;
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`.toUpperCase();
  }

  function createTooltip() {
    if (tooltipEl) return;
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'stackxray-inspector-tooltip';
    tooltipEl.style.cssText = `
      position: fixed;
      z-index: 100000000;
      background: #171717;
      color: #ffffff;
      padding: 10px 14px;
      border-radius: 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      line-height: 1.4;
      pointer-events: none;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.15);
      max-width: 280px;
      display: none;
    `;
    document.body.appendChild(tooltipEl);
  }

  function removeTooltip() {
    if (tooltipEl) {
      tooltipEl.remove();
      tooltipEl = null;
    }
  }

  function handleMouseOver(e) {
    if (!inspectorActive) return;
    if (e.target.id === 'stackxray-inspector-tooltip') return;

    if (hoveredElement) {
      hoveredElement.style.outline = hoveredElement._prevOutline || '';
      hoveredElement.style.cursor = hoveredElement._prevCursor || '';
    }

    hoveredElement = e.target;
    hoveredElement._prevOutline = hoveredElement.style.outline;
    hoveredElement._prevCursor = hoveredElement.style.cursor;
    
    hoveredElement.style.outline = '2px solid #7c3aed';
    hoveredElement.style.outlineOffset = '-2px';
    hoveredElement.style.cursor = 'crosshair';

    // Extract element attributes
    const style = window.getComputedStyle(hoveredElement);
    const tagName = hoveredElement.tagName.toLowerCase();
    const fontFamily = style.fontFamily.split(',')[0].replace(/['"]/g, '');
    const fontSize = style.fontSize;
    const fontWeight = style.fontWeight;
    const color = rgbToHex(style.color);
    const bgColor = rgbToHex(style.backgroundColor);
    
    createTooltip();
    tooltipEl.innerHTML = `
      <div style="font-weight:bold;color:#a78bfa;margin-bottom:6px;">&lt;${tagName}&gt; element</div>
      <div style="margin-bottom:4px;"><span style="color:#a3a3a3">Font:</span> ${fontFamily} (${fontSize}, ${fontWeight})</div>
      <div style="margin-bottom:4px;"><span style="color:#a3a3a3">Color:</span> ${color}</div>
      <div style="margin-bottom:4px;"><span style="color:#a3a3a3">BG:</span> ${bgColor !== 'TRANSPARENT' ? bgColor : 'transparent'}</div>
      <div style="font-size:9px;color:#a78bfa;margin-top:6px;border-top:1px solid rgba(255,255,255,0.1);padding-top:4px;">🖱️ Click to copy design tokens</div>
    `;
    tooltipEl.style.display = 'block';
    
    updateTooltipPos(e);
  }

  function updateTooltipPos(e) {
    if (!tooltipEl) return;
    const tooltipWidth = tooltipEl.offsetWidth || 150;
    const tooltipHeight = tooltipEl.offsetHeight || 80;
    
    let x = e.clientX + 15;
    let y = e.clientY + 15;
    
    if (x + tooltipWidth > window.innerWidth) {
      x = e.clientX - tooltipWidth - 15;
    }
    if (y + tooltipHeight > window.innerHeight) {
      y = e.clientY - tooltipHeight - 15;
    }
    
    tooltipEl.style.left = `${x}px`;
    tooltipEl.style.top = `${y}px`;
  }

  function handleMouseMove(e) {
    if (!inspectorActive) return;
    updateTooltipPos(e);
  }

  function handleMouseOut(e) {
    if (!inspectorActive) return;
    if (hoveredElement && e.target === hoveredElement) {
      hoveredElement.style.outline = hoveredElement._prevOutline || '';
      hoveredElement.style.cursor = hoveredElement._prevCursor || '';
      hoveredElement = null;
    }
    if (tooltipEl) {
      tooltipEl.style.display = 'none';
    }
  }

  function handleElementClick(e) {
    if (!inspectorActive) return;
    
    e.preventDefault();
    e.stopPropagation();

    const el = e.target;
    const style = window.getComputedStyle(el);
    const tagName = el.tagName.toLowerCase();
    const fontFamily = style.fontFamily.split(',')[0].replace(/['"]/g, '');
    const fontSize = style.fontSize;
    const fontWeight = style.fontWeight;
    const color = rgbToHex(style.color);
    const bgColor = rgbToHex(style.backgroundColor);

    const textToCopy = `Element: <${tagName}>\nFont Family: ${fontFamily}\nFont Size: ${fontSize}\nFont Weight: ${fontWeight}\nColor: ${color}\nBackground Color: ${bgColor}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      if (tooltipEl) {
        tooltipEl.innerHTML = `
          <div style="font-weight:bold;color:#22c55e;margin-bottom:4px;text-align:center;">✓ Style Copied!</div>
          <pre style="margin:0;font-size:9px;color:#d4d4d4;background:rgba(0,0,0,0.2);padding:6px;border-radius:4px;overflow-x:auto;white-space:pre-wrap;">${textToCopy}</pre>
        `;
      }
    }).catch(err => {
      console.error("Failed to copy styles:", err);
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'ENABLE_INSPECTOR') {
      inspectorActive = true;
      document.addEventListener('mouseover', handleMouseOver, true);
      document.addEventListener('mousemove', handleMouseMove, true);
      document.addEventListener('mouseout', handleMouseOut, true);
      document.addEventListener('click', handleElementClick, true);
      sendResponse({ success: true });
    } else if (message.action === 'DISABLE_INSPECTOR') {
      inspectorActive = false;
      document.removeEventListener('mouseover', handleMouseOver, true);
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mouseout', handleMouseOut, true);
      document.removeEventListener('click', handleElementClick, true);
      
      if (hoveredElement) {
        hoveredElement.style.outline = hoveredElement._prevOutline || '';
        hoveredElement.style.cursor = hoveredElement._prevCursor || '';
        hoveredElement = null;
      }
      removeTooltip();
      sendResponse({ success: true });
    } else if (message.action === 'GET_CONSOLE_LOGS') {
      sendResponse({ logs: window._stackXRay_IsolatedNet.logs || [] });
    }
  });
}
