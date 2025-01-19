console.log('Background script loaded');

const API_URL = 'http://localhost:11434/api/chat';

// Store conversation history for each tab
const tabConversations = new Map<number, Array<{ role: string; content: string }>>();

// Store context for each tab
const tabContexts = new Map<number, string>();

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

interface Message {
    role: string;
    content: string;
}

async function chatWithOllama(messages: Message[], tabId: number) {
    try {
        // Add context to the conversation if available
        const context = tabContexts.get(tabId);
        if (context && messages.length > 0 && messages[messages.length - 1].role === 'user') {
            const userMessage = messages[messages.length - 1];
            userMessage.content = `Given this context from the current webpage:\n${context}\n\nUser question: ${userMessage.content}`;
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: currentModel,
                messages: messages,
                stream: true
            })
        });

        console.log('Ollama response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ollama error response:', errorText);
            throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
        }

        // Send initial empty message to start the typing indicator
        chrome.tabs.sendMessage(tabId, {
            action: 'chatStart'
        });

        let fullResponse = '';
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            // Decode the stream chunk and split into lines
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            // Process each line
            for (const line of lines) {
                if (!line.trim()) continue;

                try {
                    const data = JSON.parse(line);
                    if (data.message?.content) {
                        fullResponse += data.message.content;
                        // Send incremental update
                        chrome.tabs.sendMessage(tabId, {
                            action: 'chatToken',
                            message: data.message.content
                        });
                    }
                } catch (e) {
                    console.error('Error parsing JSON:', e, line);
                }
            }
        }

        // Send completion message
        chrome.tabs.sendMessage(tabId, {
            action: 'chatComplete',
            message: fullResponse
        });

        return { role: 'assistant', content: fullResponse };
    } catch (error: any) {
        console.error('Error in chatWithOllama:', error);
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Could not connect to Ollama. Make sure Ollama is running with: ollama run phi4');
        }
        throw error;
    }
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

function getConversationHistory(tabId: number) {
    if (!tabConversations.has(tabId)) {
        tabConversations.set(tabId, []);
    }
    return tabConversations.get(tabId)!;
}

function updateContext(tabId: number, context: string) {
    console.log('Updating context for tab', tabId, ':', context);
    tabContexts.set(tabId, context);
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((
    message: { 
        action: string; 
        model?: string;
        messages?: Message[];
        context?: string;
    }, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response?: any) => void
) => {
    console.log('Received message:', message);
    const tabId = sender.tab?.id;

    if (!tabId) {
        console.error('No tab ID found');
        return;
    }

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

    if (message.action === 'chat' && message.messages) {
        chatWithOllama(message.messages, tabId)
            .then(response => {
                // Store the conversation
                const history = getConversationHistory(tabId);
                history.push(...message.messages!);
                history.push(response);
            })
            .catch(error => {
                chrome.tabs.sendMessage(tabId, {
                    action: 'chatError',
                    error: error.message
                });
            });
        return true;
    }

    if (message.action === 'updateContext' && message.context !== undefined) {
        updateContext(tabId, message.context);
        return true;
    }

    if (message.action === 'getHistory') {
        sendResponse({ history: getConversationHistory(tabId) });
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

// Handle tab activation to update context
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        // Request content update from the new active tab
        await chrome.tabs.sendMessage(activeInfo.tabId, { 
            action: 'getPageContent' 
        });
    } catch (error) {
        console.error('Error requesting page content:', error);
    }
});
