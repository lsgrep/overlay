console.log('Background script loaded');

const MODEL = 'phi4';  // Using phi4 as it's more commonly available
const API_URL = 'http://localhost:11434/api/chat';
const SYSTEM_PROMPT = `You are a helpful AI assistant. You provide clear, accurate, and concise responses. Your answers should be:
- Direct and to the point
- Factual and well-reasoned
- Helpful while acknowledging any limitations
- Written in a natural, conversational tone`;

// Store conversation history for each tab
const tabConversations = new Map();

let isVisible = false;

async function chatWithOllama(messages, tabId) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MODEL,
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

function getConversationHistory(tabId) {
    if (!tabConversations.has(tabId)) {
        tabConversations.set(tabId, [{
            role: 'system',
            content: SYSTEM_PROMPT
        }]);
    }
    return tabConversations.get(tabId);
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
});
