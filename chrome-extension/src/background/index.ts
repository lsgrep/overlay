import 'webextension-polyfill';
import { exampleThemeStorage, defaultLanguageStorage } from '@extension/storage';

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
  const languageNames: { [key: string]: string } = {
    english: 'English',
    spanish: 'Spanish',
    french: 'French',
    german: 'German',
    italian: 'Italian',
    portuguese: 'Portuguese',
    russian: 'Russian',
    chinese: 'Chinese',
    japanese: 'Japanese',
    korean: 'Korean',
  };
  return languageNames[targetLang] || 'English';
};

const CONTEXT_MENU_ACTIONS = [
  {
    id: 'translate',
    title: '🔄 Translate',
    contexts: ['selection'],
  },
  {
    id: 'explain',
    title: '🤖 Explain This',
    contexts: ['selection'],
  },
  {
    id: 'improve',
    title: '✨ Improve Writing',
    contexts: ['selection'],
  },
  {
    id: 'summarize',
    title: '📋 Summarize',
    contexts: ['selection'],
  },
];

// Update translate menu title
const updateTranslateTitle = async () => {
  const targetLang = await getLanguageName();
  chrome.contextMenus.update('translate', {
    title: `🔄 Translate to ${targetLang}`,
  });
};

// Listen for storage changes
chrome.storage.onChanged.addListener(changes => {
  if (changes['default-language']) {
    updateTranslateTitle();
  }
});

// Create context menu items
chrome.runtime.onInstalled.addListener(async () => {
  // Create parent menu item
  chrome.contextMenus.create({
    id: 'overlay-actions',
    title: ' Overlay AI',
    contexts: ['selection'],
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
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.selectionText && tab?.windowId) {
    const actionId = info.menuItemId as string;

    // First open the side panel
    await chrome.sidePanel.open({ windowId: tab.windowId });

    // Then send the message after a small delay to ensure panel is ready
    setTimeout(async () => {
      try {
        await chrome.runtime.sendMessage({
          type: 'CONTEXT_MENU_ACTION',
          actionId,
          text: info.selectionText,
        });
        console.log('Sent context menu action:', { actionId, text: info.selectionText });
      } catch (error) {
        console.error('Error sending message:', error);
        // Try sending to all tabs if direct message fails
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          if (tab.id) {
            try {
              await chrome.tabs.sendMessage(tab.id, {
                type: 'CONTEXT_MENU_ACTION',
                actionId,
                text: info.selectionText,
              });
              console.log('Sent message to tab:', tab.id);
            } catch (e) {
              console.log('Could not send to tab:', tab.id, e);
            }
          }
        }
      }
    }, 500);
  }
});
