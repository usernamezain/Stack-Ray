window._stackXRay_Net = { errors: 0, requests: [] };

let isLoggingReq = false;
let isLoggingError = false;

// Helper to broadcast network requests
function broadcastRequest(req) {
  if (isLoggingReq) return;
  isLoggingReq = true;
  try {
    if (!window._stackXRay_Net) {
      window._stackXRay_Net = { errors: 0, requests: [] };
    }
    window._stackXRay_Net.requests.push(req);
    window.postMessage({ type: 'STACK_XRAY_NET_REQ', request: req }, '*');
  } catch (e) {}
  isLoggingReq = false;
}

// Helper to broadcast errors
function broadcastError() {
  if (isLoggingError) return;
  isLoggingError = true;
  try {
    if (!window._stackXRay_Net) {
      window._stackXRay_Net = { errors: 0, requests: [] };
    }
    window._stackXRay_Net.errors++;
    window.postMessage({ type: 'STACK_XRAY_NET_ERR' }, '*');
  } catch (e) {}
  isLoggingError = false;
}

// 1. Hook Fetch API
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  try {
    let url = '';
    if (typeof args[0] === 'string') url = args[0];
    else if (args[0] && args[0].url) url = args[0].url;
    
    let method = 'GET';
    if (args[1] && args[1].method) method = args[1].method.toUpperCase();
    
    let isGraphQL = false;
    if (method === 'POST' && args[1] && args[1].body && typeof args[1].body === 'string') {
      if (args[1].body.includes('query') || args[1].body.includes('mutation')) {
        isGraphQL = true;
      }
    }

    broadcastRequest({ url, method, isGraphQL });
  } catch (e) {}
  return originalFetch.apply(this, args);
};

// 2. Hook XMLHttpRequest API
try {
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._stackXRay_Method = method;
    this._stackXRay_Url = url;
    return originalXHROpen.apply(this, [method, url, ...args]);
  };

  const originalXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(body, ...args) {
    try {
      const method = (this._stackXRay_Method || 'GET').toUpperCase();
      const url = this._stackXRay_Url || '';
      let isGraphQL = false;
      if (method === 'POST' && typeof body === 'string') {
        if (body.includes('query') || body.includes('mutation')) {
          isGraphQL = true;
        }
      }
      broadcastRequest({ url, method, isGraphQL });
    } catch (e) {}
    return originalXHRSend.apply(this, [body, ...args]);
  };
} catch (e) {}

// 3. Hook Console logs, warnings, and errors
window._stackXRay_Net.logs = [];

function broadcastConsole(type, args) {
  try {
    const text = args.map(arg => {
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg); } catch(e) { return String(arg); }
      }
      return String(arg);
    }).join(' ');
    const time = new Date().toLocaleTimeString();
    
    if (!window._stackXRay_Net.logs) {
      window._stackXRay_Net.logs = [];
    }
    // Limit log cache to 100 entries to prevent memory leaks
    if (window._stackXRay_Net.logs.length > 100) {
      window._stackXRay_Net.logs.shift();
    }
    window._stackXRay_Net.logs.push({ type, text, time });
    window.postMessage({ type: 'STACK_XRAY_CONSOLE_LOG', log: { type, text, time } }, '*');
  } catch (e) {}
}

const originalLog = console.log;
console.log = function(...args) {
  broadcastConsole('log', args);
  originalLog.apply(console, args);
};

const originalWarn = console.warn;
console.warn = function(...args) {
  broadcastConsole('warn', args);
  originalWarn.apply(console, args);
};

const originalError = console.error;
console.error = function(...args) {
  broadcastError();
  broadcastConsole('error', args);
  originalError.apply(console, args);
};

// 4. Hook window unhandled errors and rejections
window.addEventListener('error', function(event) {
  broadcastError();
  broadcastConsole('error', [event.message || "Unhandled error occurred"]);
});

window.addEventListener('unhandledrejection', function(event) {
  broadcastError();
  broadcastConsole('error', ["Unhandled promise rejection: " + (event.reason ? String(event.reason) : "Unknown reason")]);
});
