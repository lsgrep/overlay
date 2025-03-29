import 'webextension-polyfill';
import { exampleThemeStorage, defaultLanguageStorage, proxyModeStorage } from '@extension/storage';
import { getLanguageNameFromCode } from '@extension/i18n';
// Import auth module
import './auth';

// Enable side panel opening on extension icon click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(error => console.error('Error setting side panel behavior:', error));

// Initialize theme
exampleThemeStorage.get().then(theme => {
  console.log('Theme initialized:', theme);
});

console.log('Background service worker loaded');
// Context menu actions
const getLanguageName = async () => {
  const targetLang = await defaultLanguageStorage.get();
  // Hard-coded language mapping
  return getLanguageNameFromCode(targetLang) || 'English';
};

// Define context menu actions with correct types
const CONTEXT_MENU_ACTIONS = [
  {
    id: 'translate',
    title: '🔄 Translate',
    contexts: ['selection'] as chrome.contextMenus.ContextType[],
  },
  {
    id: 'explain',
    title: '🤖 Explain This',
    contexts: ['selection'] as chrome.contextMenus.ContextType[],
  },
  {
    id: 'improve',
    title: '✨ Improve Writing',
    contexts: ['selection'] as chrome.contextMenus.ContextType[],
  },
  {
    id: 'summarize',
    title: '📋 Summarize',
    contexts: ['selection'] as chrome.contextMenus.ContextType[],
  },
  {
    id: 'take-note',
    title: '📝 Take Note',
    contexts: ['selection'] as chrome.contextMenus.ContextType[],
  },
];

// Update translate menu title
const updateTranslateTitle = async () => {
  const targetLang = await getLanguageName();
  chrome.contextMenus.update('translate', {
    title: `🔄 Translate to ${targetLang}`,
  });
};

// Configure proxy settings
const configureProxy = async () => {
  const proxyEnabled = await proxyModeStorage.get();

  if (proxyEnabled) {
    // Enable proxy
    const config = {
      mode: 'fixed_servers',
      rules: {
        singleProxy: {
          scheme: 'https',
          host: 'proxy.overlay.ai', // Replace with actual proxy service
          port: 443,
        },
        bypassList: ['localhost', '127.0.0.1'],
      },
    };

    chrome.proxy.settings.set({ value: config, scope: 'regular' }, () => {
      console.log('Proxy enabled');
    });
  } else {
    // Disable proxy - use system settings
    chrome.proxy.settings.set({ value: { mode: 'system' }, scope: 'regular' }, () => {
      console.log('Proxy disabled');
    });
  }
};

// Initialize proxy settings
proxyModeStorage.get().then(enabled => {
  console.log('Proxy mode initialized:', enabled);
  configureProxy();
});

// Listen for storage changes
chrome.storage.onChanged.addListener(changes => {
  if (changes['default-language']) {
    updateTranslateTitle();
  }

  if (changes['proxy-mode']) {
    configureProxy();
  }
});

// Create context menu items
chrome.runtime.onInstalled.addListener(async () => {
  // Create parent menu item
  chrome.contextMenus.create({
    id: 'overlay-actions',
    title: ' Overlay AI',
    contexts: ['selection'] as chrome.contextMenus.ContextType[],
  });

  // Create child menu items for each action
  CONTEXT_MENU_ACTIONS.forEach(action => {
    chrome.contextMenus.create({
      ...action,
      parentId: 'overlay-actions',
    });
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.selectionText && tab?.windowId) {
    const actionId = info.menuItemId as string;

    // First open the side panel - using direct callback approach instead of async/await
    // to preserve the user gesture context
    chrome.sidePanel.open({ windowId: tab.windowId });

    // Then send the message after a small delay to ensure panel is ready
    setTimeout(() => {
      chrome.runtime.sendMessage(
        {
          type: 'CONTEXT_MENU_ACTION',
          actionId,
          text: info.selectionText,
          url: tab.url, // Pass the current URL
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error('Error sending message:', chrome.runtime.lastError);
            // Try sending to all tabs if direct message fails
            chrome.tabs.query({}, tabs => {
              for (const tab of tabs) {
                if (tab.id) {
                  chrome.tabs.sendMessage(
                    tab.id,
                    {
                      type: 'CONTEXT_MENU_ACTION',
                      actionId,
                      text: info.selectionText,
                      url: tab.url,
                    },
                    () => {
                      if (!chrome.runtime.lastError) {
                        console.log('Sent message to tab:', tab.id);
                      } else {
                        console.log('Could not send to tab:', tab.id, chrome.runtime.lastError);
                      }
                    },
                  );
                }
              }
            });
          } else {
            console.log('Sent context menu action:', { actionId, text: info.selectionText, url: tab.url });
          }
        },
      );
    }, 500);
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OPEN_SIDE_PANEL' && sender.tab?.windowId) {
    // Use callback style to preserve user gesture
    chrome.sidePanel.open({ windowId: sender.tab.windowId });
    sendResponse({ success: true });
    return true; // Required for async sendResponse
  }
  return false; // Add return value for all code paths
});
