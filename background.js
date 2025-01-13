console.log('Background script loaded');

const API_URL = 'http://localhost:11434/api/chat';
const SYSTEM_PROMPT = `You are a helpful AI assistant. You provide clear, accurate, and concise responses. Your answers should be:
- Direct and to the point
- Factual and well-reasoned
- Helpful while acknowledging any limitations
- Written in a natural, conversational tone`;

// Store conversation history for each tab
const tabConversations = new Map();

// Store context for each tab
const tabContexts = new Map();

let isVisible = false;
let currentModel = 'phi4';  // Default model, but will be updated by user selection

// Add function to update current model
function updateCurrentModel(model) {
    console.log('Updating current model to:', model);
    currentModel = model;
}

async function chatWithOllama(messages, tabId) {
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
                model: currentModel, // Use the current selected model
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
        const reader = response.body.getReader();
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

        return { message: { content: fullResponse } };
    } catch (error) {
        console.error('Error in chatWithOllama:', error);
        if (error.message.includes('Failed to fetch')) {
            throw new Error('Could not connect to Ollama. Make sure Ollama is running with: ollama run phi4');
        }
        throw error;
    }
}

async function fetchOllamaModels() {
    try {
        const response = await fetch('http://localhost:11434/v1/models', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });
        const data = await response.json();
        console.log('Fetched models from Ollama:', data);
        return data.data || [];
    } catch (error) {
        console.error('Error fetching Ollama models:', error);
        return [];
    }
}

function getConversationHistory(tabId) {
    if (!tabConversations.has(tabId)) {
        tabConversations.set(tabId, [{
            role: 'system',
            content: SYSTEM_PROMPT
        }]);
    }
    return tabConversations.get(tabId);
}

function updateContext(tabId, context) {
    tabContexts.set(tabId, context);
    // Update the system message with the new context
    const history = getConversationHistory(tabId);
    history[0] = {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\nCurrent page context:\n${context}`
    };
}

// Handle extension icon clicks
chrome.action.onClicked.addListener((tab) => {
    console.log('Extension icon clicked');
    isVisible = !isVisible;
    chrome.tabs.sendMessage(tab.id, {
        action: 'toggleSidebar',
        state: isVisible
    }).catch(error => {
        console.error('Error sending message:', error);
        if (error.message.includes('Could not establish connection')) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            }).then(() => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'toggleSidebar',
                    state: isVisible
                });
            });
        }
    });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    const tabId = sender.tab.id;
    console.log('Received message:', request, 'from tab:', tabId);
    
    if (request.action === 'chat') {
        const history = getConversationHistory(tabId);
        
        // Add user message to history
        history.push({
            role: 'user',
            content: request.message
        });

        // Get response from Ollama
        chatWithOllama(history, tabId)
            .then(response => {
                // Add assistant response to history
                history.push({
                    role: 'assistant',
                    content: response.message.content
                });

                // Keep conversation history manageable
                if (history.length > 20) {
                    history.splice(1, history.length - 20); // Keep system prompt and last 19 messages
                }
            })
            .catch(error => {
                console.error('Ollama error:', error);
                chrome.tabs.sendMessage(tabId, {
                    action: 'chatError',
                    message: error.message
                });
            });

        // Required for async response
        return true;
    }
    
    if (request.action === 'resetChat') {
        tabConversations.set(tabId, [{
            role: 'system',
            content: SYSTEM_PROMPT
        }]);
        
        chrome.tabs.sendMessage(tabId, {
            action: 'chatResponse',
            message: "Conversation has been reset. How can I help you today?"
        });
        
        return true;
    }

    if (request.action === 'fetchModels') {
        fetchOllamaModels()
            .then(models => {
                console.log('Sending models to content script:', models);
                sendResponse({ models: models });
            })
            .catch(error => {
                console.error('Error in fetchModels:', error);
                sendResponse({ models: [] });
            });
        return true; // Will respond asynchronously
    }

    if (request.action === 'updateModel') {
        updateCurrentModel(request.model);
        sendResponse({ success: true });
        return false;
    }

    if (request.action === 'updateContext') {
        updateContext(sender.tab.id, request.context);
        sendResponse({ success: true });
        return false;
    }
});
