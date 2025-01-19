chrome.action.onClicked.addListener(async (tab: chrome.tabs.Tab) => {
  if (!tab.id) return;

  try {
    // Try to send a message first
    await chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' as const });
  } catch (err) {
    // If the content script isn't ready, inject it
    const error = err as Error;
    if (error.message?.includes('Receiving end does not exist')) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/main.tsx']
      });
      // Try sending the message again after injection
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' as const });
    } else {
      console.error('Error sending message:', error);
    }
  }
});
