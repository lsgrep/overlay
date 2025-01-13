console.log('Background script loaded');

let isVisible = false;

chrome.action.onClicked.addListener((tab) => {
    console.log('Extension icon clicked');
    isVisible = !isVisible;
    
    chrome.tabs.sendMessage(tab.id, {
        action: 'toggleSidebar',
        state: isVisible
    }).catch(error => {
        console.error('Error sending message:', error);
        // If the content script isn't ready, try injecting it
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        }).then(() => {
            // Retry sending the message after injection
            chrome.tabs.sendMessage(tab.id, {
                action: 'toggleSidebar',
                state: isVisible
            });
        }).catch(error => {
            console.error('Error injecting script:', error);
        });
    });
});
