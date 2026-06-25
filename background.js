// background.js - Service worker for StackRay

// Enable Side Panel globally when the extension action icon is clicked
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("Error setting panel behavior:", error));
});

// Handle browser startup/load to guarantee behavior is active
chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("Error setting panel behavior:", error));
});

// Listen for keyboard commands defined in manifest.json
chrome.commands.onCommand.addListener(async (command) => {
  console.log(`Command triggered: ${command}`);
  if (command === 'export-data') {
    try {
      // Broadcast the message to all extension pages (popup/sidepanel)
      chrome.runtime.sendMessage({ action: 'export-data' }).catch(() => {
        // Suppress errors when no active sidepanel listener exists
      });
    } catch (e) {
      console.error("Failed to send command message:", e);
    }
  }
});
