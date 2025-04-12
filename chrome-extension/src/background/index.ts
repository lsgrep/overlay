// background.js

// Import polyfill at the very beginning if you are using it consistently
// import 'webextension-polyfill'; // Uncomment if using webextension-polyfill

import { exampleThemeStorage, defaultLanguageStorage, proxyModeStorage } from '@extension/storage';
import { getLanguageNameFromCode } from '@extension/i18n';
// Import auth module (assuming './auth' handles its own initialization)
import './auth';

console.log('Background service worker loading...');

// --- Side Panel Setup ---

// Allow users to open the side panel by clicking the action toolbar icon
// This is the primary way users should open it manually.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(error => console.error('Error setting side panel behavior:', error));

// --- Initialization ---

// Initialize theme
exampleThemeStorage
  .get()
  .then(theme => {
    console.log('Theme initialized:', theme);
  })
  .catch(error => console.error('Error initializing theme:', error));

// Initialize proxy settings on startup
proxyModeStorage
  .get()
  .then(enabled => {
    console.log('Proxy mode initialized:', enabled);
    configureProxy(); // Call configureProxy after getting the initial value
  })
  .catch(error => console.error('Error initializing proxy mode:', error));

// --- Context Menu Setup ---

// Function to get language name (assuming it returns a Promise)
const getLanguageName = async () => {
  try {
    const targetLang = await defaultLanguageStorage.get();
    return getLanguageNameFromCode(targetLang) || 'English'; // Fallback to English
  } catch (error) {
    console.error('Error getting language name:', error);
    return 'English'; // Fallback on error
  }
};

// Define context menu actions
const CONTEXT_MENU_ACTIONS = [
  { id: 'translate', title: '🔄 Translate', contexts: ['selection'] as chrome.contextMenus.ContextType[] },
  { id: 'explain', title: '🤖 Explain This', contexts: ['selection'] as chrome.contextMenus.ContextType[] },
  { id: 'improve', title: '✨ Improve Writing', contexts: ['selection'] as chrome.contextMenus.ContextType[] },
  { id: 'summarize', title: '📋 Summarize', contexts: ['selection'] as chrome.contextMenus.ContextType[] },
  { id: 'take-note', title: '📝 Take Note', contexts: ['selection'] as chrome.contextMenus.ContextType[] },
];

// Function to update the dynamic translate menu title
const updateTranslateTitle = async () => {
  try {
    const targetLangName = await getLanguageName();
    chrome.contextMenus.update(
      'translate',
      {
        title: `🔄 Translate to ${targetLangName}`,
      },
      () => {
        if (chrome.runtime.lastError) {
          // Log error but don't stop execution, menu might not exist yet on first install
          console.warn(`Error updating context menu title: ${chrome.runtime.lastError.message}`);
        }
      },
    );
  } catch (error) {
    console.error('Error preparing to update context menu title:', error);
  }
};

// --- Proxy Configuration ---

// Function to configure Chrome's proxy settings based on storage
const configureProxy = async () => {
  try {
    const proxyEnabled = await proxyModeStorage.get();
    let config: chrome.proxy.ProxyConfig;

    if (proxyEnabled) {
      console.log('Enabling proxy...');
      config = {
        mode: 'fixed_servers',
        rules: {
          singleProxy: {
            scheme: 'https',
            host: 'proxy.overlay.ai', // Replace with actual proxy service if needed
            port: 443,
          },
          bypassList: ['localhost', '127.0.0.1', '<local>'], // Added <local> for common practice
        },
      };
    } else {
      console.log('Disabling proxy (using system settings)...');
      config = { mode: 'system' };
    }

    chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
      if (chrome.runtime.lastError) {
        console.error(`Error setting proxy: ${chrome.runtime.lastError.message}`);
      } else {
        console.log(`Proxy ${proxyEnabled ? 'enabled' : 'disabled (system settings)'}.`);
      }
    });
  } catch (error) {
    console.error('Error configuring proxy:', error);
  }
};

// --- Event Listeners ---

// Listen for storage changes to update settings dynamically
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' && areaName !== 'sync') return; // Focus on relevant storage areas

  if (changes['default-language']) {
    console.log('Default language changed, updating context menu...');
    updateTranslateTitle();
  }

  if (changes['proxy-mode']) {
    console.log('Proxy mode changed, reconfiguring proxy...');
    configureProxy();
  }

  if (changes['example-theme']) {
    console.log('Theme changed:', changes['example-theme'].newValue);
    // Add any theme update logic needed in the background here, if any
  }
});

// Create context menus on installation or update
chrome.runtime.onInstalled.addListener(async details => {
  console.log('Extension installed or updated:', details.reason);

  // Create parent menu item
  chrome.contextMenus.create(
    {
      id: 'overlay-actions',
      title: '✨ Overlay AI', // Using an emoji might be nice
      contexts: ['selection'] as chrome.contextMenus.ContextType[],
    },
    () => {
      if (chrome.runtime.lastError) console.error(`Error creating parent menu: ${chrome.runtime.lastError.message}`);
    },
  );

  // Create child menu items
  CONTEXT_MENU_ACTIONS.forEach(action => {
    chrome.contextMenus.create(
      {
        ...action, // Spread properties like id, title, contexts
        parentId: 'overlay-actions',
      },
      () => {
        if (chrome.runtime.lastError)
          console.error(`Error creating menu item ${action.id}: ${chrome.runtime.lastError.message}`);
      },
    );
  });

  // Update the translate title immediately after creation
  await updateTranslateTitle();
});

// --- Action Handlers ---

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Ensure we have the necessary info to proceed
  if (!info.selectionText || !tab?.windowId || !tab.id) {
    console.warn('Context menu clicked without sufficient info (selection, windowId, tabId).');
    return;
  }

  const actionId = info.menuItemId as string;
  const windowId = tab.windowId;
  const selectionText = info.selectionText;
  const pageUrl = tab.url; // Get URL from the tab object

  console.log(`Context menu action '${actionId}' triggered.`);

  // --- Open Side Panel (User Gesture Context) ---
  // This call is directly triggered by the context menu click, fulfilling the user gesture requirement.
  chrome.sidePanel.open({ windowId: windowId }, () => {
    if (chrome.runtime.lastError) {
      console.error(`Error opening side panel from context menu: ${chrome.runtime.lastError.message}`);
      // Optionally notify the user or log more details
      return; // Stop if panel couldn't be opened
    }

    console.log(`Side panel open initiated for window ${windowId}. Sending action message...`);

    // --- Send Message (Immediately After Initiating Open) ---
    // Send the action details to the runtime (potentially the side panel or other listeners)
    chrome.runtime.sendMessage(
      {
        type: 'CONTEXT_MENU_ACTION',
        actionId,
        text: selectionText,
        url: pageUrl, // Pass the page URL
      },
      () => {
        // This callback checks if the message was *sent* successfully.
        // It doesn't guarantee it was *received* (the side panel might still be loading).
        if (chrome.runtime.lastError) {
          // This is often expected if the side panel isn't open or ready to listen yet. Log as warning.
          console.warn(
            `Sending CONTEXT_MENU_ACTION failed (panel might not be listening yet): ${chrome.runtime.lastError.message}`,
          );
        } else {
          console.log('CONTEXT_MENU_ACTION message sent successfully.');
        }
      },
    );
  });
});

// Handle messages from other parts of the extension (e.g., content scripts)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // --- Handle Request to Open Side Panel ---
  if (message.type === 'OPEN_SIDE_PANEL' && sender.tab?.windowId) {
    const windowId = sender.tab.windowId;
    console.log(`Received OPEN_SIDE_PANEL request from tab ${sender.tab.id} in window ${windowId}.`);

    // IMPORTANT: This code assumes the message was sent from the content script
    // *immediately* in response to a user gesture (e.g., clicking a button
    // injected by the content script). If not, this `open` call will fail.
    chrome.sidePanel.open({ windowId: windowId }, () => {
      if (chrome.runtime.lastError) {
        console.error(`Error opening side panel via message: ${chrome.runtime.lastError.message}`);
        // Respond with failure if needed by the content script
        try {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } catch (e) {
          console.warn('Could not send error response back for OPEN_SIDE_PANEL');
        }
      } else {
        console.log(`Side panel opened successfully via message for window ${windowId}.`);
        // Respond with success
        try {
          sendResponse({ success: true });
        } catch (e) {
          console.warn('Could not send success response back for OPEN_SIDE_PANEL');
        }
      }
    });

    // Return true to indicate that sendResponse will be called asynchronously (within the 'open' callback).
    return true;
  }

  // --- Handle other message types if needed ---
  // if (message.type === 'ANOTHER_ACTION') { ... }

  // If the message isn't handled here, return false or undefined.
  console.log('Message received, but not handled by this listener:', message);
  return false;
});

console.log('Background service worker loaded and listeners attached.');
