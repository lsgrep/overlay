export const navigateTo = async (url: string): Promise<chrome.tabs.Tab> => {
  // Create a new tab and wait for it to be created
  const tab = await chrome.tabs.create({ url, active: true });

  // Wait for the page to finish loading
  return new Promise((resolve, reject) => {
    const checkComplete = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (tabId === tab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(checkComplete);
        resolve(tab);
      }
    };

    chrome.tabs.onUpdated.addListener(checkComplete);

    // Set a timeout to avoid hanging indefinitely
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(checkComplete);
      reject(new Error('Navigation timeout'));
    }, 30000); // 30 second timeout
  });
};
