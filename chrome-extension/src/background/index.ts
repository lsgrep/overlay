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
