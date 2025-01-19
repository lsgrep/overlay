console.log('Background script loaded');

let isVisible = false;
export let currentModel = 'phi4';  // Default model, but will be updated by user selection

// Add function to update current model
function updateCurrentModel(model: string) {
    console.log('Updating current model to:', model);
    currentModel = model;
}

interface OllamaModel {
    id: string;
    object: string;
    created: number;
    owned_by: string;
}

async function fetchOllamaModels() {
    try {
        const response = await fetch('http://localhost:11434/v1/models');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Raw models data:', data);
        
        // Transform data into expected format
        const models = data.data?.map((model: OllamaModel) => ({
            id: model.id.replace(':latest', '')
        })) || [];
        
        console.log('Transformed models:', models);
        return models;
    } catch (error) {
        console.error('Error fetching models:', error);
        throw error;
    }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message: { action: string; model?: string }, _sender, sendResponse) => {
    console.log('Received message:', message);

    if (message.action === 'fetchModels') {
        fetchOllamaModels()
            .then(models => {
                sendResponse({ models });
            })
            .catch(error => {
                console.error('Error in fetchModels:', error);
                sendResponse({ models: [] });
            });
        return true; // Will respond asynchronously
    }

    if (message.action === 'updateModel' && message.model) {
        updateCurrentModel(message.model);
        return true;
    }
});

// Handle extension icon clicks
chrome.action.onClicked.addListener(async (tab: chrome.tabs.Tab) => {
    console.log('Extension icon clicked');
    isVisible = !isVisible;
    
    if (tab.id) {
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
    }
});
