import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';

// Enable side panel opening on extension icon click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(error => console.error('Error setting side panel behavior:', error));

// Initialize theme
exampleThemeStorage.get().then(theme => {
  console.log('Theme initialized:', theme);
});

console.log('Background service worker loaded');
// Create context menu item with icon
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'send-to-chat',
    title: 'Send to Overlay Chat',
    contexts: ['selection'],
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'send-to-chat' && info.selectionText && tab?.windowId) {
    // First open the side panel
    await chrome.sidePanel.open({ windowId: tab.windowId });

    // Then send the message after a small delay to ensure panel is ready
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: 'SELECTED_TEXT',
        text: info.selectionText,
      });
      console.log('Sent selected text to side panel:', info.selectionText);
    }, 500);
  }
});
