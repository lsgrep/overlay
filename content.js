console.log('Content script loaded - v9');

let chatWorker = null;

function formatTime(date) {
    return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: 'numeric',
        hour12: true 
    });
}

function createMessageElement(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = text;
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = formatTime(new Date());
    
    messageDiv.appendChild(content);
    messageDiv.appendChild(time);
    
    return messageDiv;
}

function scrollToBottom(element) {
    element.scrollTop = element.scrollHeight;
}

async function fetchModels() {
    try {
        console.log('Requesting models from background script...');
        // Send a message to the background script to fetch models
        const response = await chrome.runtime.sendMessage({
            action: 'fetchModels'
        });
        console.log('Received models from background:', response);
        return response.models || [];
    } catch (error) {
        console.error('Error fetching models:', error);
        return [];
    }
}

function populateModelDropdown(models) {
    console.log('Populating dropdown with models:', models);
    const modelSelect = document.getElementById('modelSelect');
    if (!modelSelect) {
        console.error('Model select element not found');
        return;
    }

    modelSelect.innerHTML = '';
    
    // Sort models alphabetically
    models.sort((a, b) => a.id.localeCompare(b.id));
    
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        // Clean up the model name for display (remove :latest if present)
        const displayName = model.id.replace(':latest', '');
        option.textContent = displayName;
        modelSelect.appendChild(option);
        console.log('Added model option:', displayName);
    });

    // Add event listener for model selection
    modelSelect.addEventListener('change', async function() {
        const selectedModel = this.value;
        console.log('Selected model:', selectedModel);
        localStorage.setItem('selectedModel', selectedModel);
        
        // Add system message about model change
        const chatMessages = document.querySelector('.chat-messages');
        const message = createMessageElement(`Switched to ${selectedModel} model`, false);
        message.classList.add('system-message');
        chatMessages.appendChild(message);
        scrollToBottom(chatMessages);
        
        // Notify background script of model change
        try {
            await chrome.runtime.sendMessage({
                action: 'updateModel',
                model: selectedModel
            });
            console.log('Model updated in background script');
        } catch (error) {
            console.error('Error updating model in background:', error);
        }
    });

    // Restore previously selected model if any
    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel) {
        modelSelect.value = savedModel;
        console.log('Restored saved model:', savedModel);
        // Also update the background script with the restored model
        chrome.runtime.sendMessage({
            action: 'updateModel',
            model: savedModel
        }).catch(error => {
            console.error('Error updating restored model:', error);
        });
    }
}

function getPageContent() {
    // Get the main content of the page
    const content = document.body.innerText;
    return content.trim();
}

async function updateContext(content) {
    try {
        await chrome.runtime.sendMessage({
            action: 'updateContext',
            context: content
        });
        console.log('Context updated successfully');
    } catch (error) {
        console.error('Error updating context:', error);
    }
}

function createSidebar() {
    console.log('Creating sidebar');
    
    // Remove existing elements if they exist
    const existingContainer = document.getElementById('chrome-extension-container');
    if (existingContainer) {
        existingContainer.remove();
    }

    // Create container
    const container = document.createElement('div');
    container.id = 'chrome-extension-container';
    
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.id = 'chrome-extension-wrapper';
    
    // Create sidebar
    const sidebar = document.createElement('div');
    sidebar.id = 'chrome-extension-sidebar';
    
    // Set up the structure
    container.appendChild(wrapper);
    container.appendChild(sidebar);
    
    // Move all existing body content to wrapper
    while (document.body.firstChild) {
        wrapper.appendChild(document.body.firstChild);
    }
    
    // Add container to body
    document.body.appendChild(container);
    
    // Add sidebar content
    sidebar.innerHTML = `
        <div class="sidebar-header">
            <h2>Local Chat</h2>
            <div class="header-buttons">
                <button id="get-content" title="Get page content" class="context-inactive">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                </button>
                <button id="reset-chat" title="Reset conversation">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                    </svg>
                </button>
                <button id="close-sidebar">×</button>
            </div>
        </div>
        <div class="model-selector">
            <select id="modelSelect" class="model-dropdown">
                <option value="">Loading models...</option>
            </select>
        </div>
        <div class="chat-container">
            <div class="chat-messages">
                <div class="message assistant">
                    <div class="message-content">Hello! I'm your Phi-powered AI assistant. How can I help you today?</div>
                    <div class="message-time">${formatTime(new Date())}</div>
                </div>
            </div>
            <div class="chat-input-container">
                <div class="chat-input-wrapper">
                    <textarea 
                        class="chat-input" 
                        placeholder="Type a message..."
                        rows="1"
                    ></textarea>
                    <button class="send-button">
                        <svg viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Get elements
    const chatMessages = sidebar.querySelector('.chat-messages');
    const chatInput = sidebar.querySelector('.chat-input');
    const sendButton = sidebar.querySelector('.send-button');
    const getContentButton = sidebar.querySelector('#get-content');

    // Function to send message
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (text) {
            // Add user message
            chatMessages.appendChild(createMessageElement(text, true));
            chatInput.value = '';
            chatInput.style.height = 'auto';
            scrollToBottom(chatMessages);

            // Show typing indicator
            const typingDiv = document.createElement('div');
            typingDiv.className = 'message assistant typing';
            typingDiv.innerHTML = '<div class="message-content">Typing...</div>';
            chatMessages.appendChild(typingDiv);
            scrollToBottom(chatMessages);

            try {
                // Get page content and update context
                const pageContent = getPageContent();
                await updateContext(pageContent);
                
                // Add context notification
                const contextMessage = createMessageElement('Page content added as context.', false);
                contextMessage.classList.add('system-message');
                chatMessages.appendChild(contextMessage);
                scrollToBottom(chatMessages);

                // Send message to background script
                chrome.runtime.sendMessage({
                    action: 'chat',
                    message: text
                });
            } catch (error) {
                console.error('Error sending message:', error);
                typingDiv.remove();
                chatMessages.appendChild(createMessageElement('Error: Failed to send message', false));
            }
        }
    }

    // Add event listeners
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendButton.addEventListener('click', sendMessage);

    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    });

    // Reset chat button handler
    document.getElementById('reset-chat').addEventListener('click', () => {
        // Clear chat messages except the first one
        while (chatMessages.childNodes.length > 1) {
            chatMessages.removeChild(chatMessages.lastChild);
        }
        
        // Reset conversation in background script
        chrome.runtime.sendMessage({ action: 'resetChat' });
    });

    // Close button handler
    document.getElementById('close-sidebar').addEventListener('click', () => {
        console.log('Close button clicked');
        toggleSidebar(false);
    });

    // Add click handler for get content button
    getContentButton.addEventListener('click', async () => {
        const pageContent = getPageContent();
        
        // Toggle context state
        const isActive = getContentButton.classList.toggle('context-active');
        getContentButton.classList.remove('context-inactive');
        
        if (isActive) {
            // Update context in background script
            await updateContext(pageContent);
            
            // Add visual feedback
            const message = createMessageElement('Page content added as context for future messages.', false);
            message.classList.add('system-message');
            chatMessages.appendChild(message);
        } else {
            // Clear context
            await updateContext('');
            getContentButton.classList.add('context-inactive');
            
            // Add visual feedback
            const message = createMessageElement('Page context removed.', false);
            message.classList.add('system-message');
            chatMessages.appendChild(message);
        }
        
        scrollToBottom(chatMessages);
    });

    // Handle scroll synchronization
    let lastScrollTop = 0;
    wrapper.addEventListener('scroll', () => {
        if (wrapper.scrollTop !== lastScrollTop) {
            window.scrollTo(0, wrapper.scrollTop);
            lastScrollTop = wrapper.scrollTop;
        }
    });

    window.addEventListener('scroll', () => {
        if (window.scrollY !== lastScrollTop) {
            wrapper.scrollTop = window.scrollY;
            lastScrollTop = window.scrollY;
        }
    });

    // Set initial scroll position
    wrapper.scrollTop = window.scrollY;
}

function toggleSidebar(show) {
    const container = document.getElementById('chrome-extension-container');
    if (container) {
        container.classList.toggle('sidebar-visible', show);
        
        // Update body margin to prevent content shift
        if (show) {
            document.body.style.marginRight = '300px';
        } else {
            document.body.style.marginRight = '0';
        }
        
        console.log('Sidebar visibility:', show);
    }
}

// Initialize the sidebar
async function initialize() {
    console.log('Initializing sidebar...');
    if (document.body) {
        await setupSidebar();
        
        // Watch for dynamic content changes
        const observer = new MutationObserver(async (mutations) => {
            mutations.forEach(async (mutation) => {
                if (mutation.type === 'childList' && !document.getElementById('chrome-extension-container')) {
                    console.log('Page content changed, reinitializing sidebar');
                    await setupSidebar();
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    } else {
        document.addEventListener('DOMContentLoaded', setupSidebar);
    }
}

// Separate setup function to handle both initial creation and recreation
async function setupSidebar() {
    createSidebar();
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .system-message {
            opacity: 0.7;
            font-style: italic;
            font-size: 0.9em;
        }
        .system-message .message-content {
            color: #666;
        }
    `;
    document.head.appendChild(style);

    // Fetch and populate models
    console.log('Fetching models after sidebar creation...');
    const models = await fetchModels();
    console.log('Models fetched, populating dropdown...', models);
    populateModelDropdown(models);
}

// Start initialization
initialize();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request);
    
    if (request.action === 'toggleSidebar') {
        toggleSidebar(request.state);
    }
    
    const chatMessages = document.querySelector('.chat-messages');
    if (!chatMessages) return;

    if (request.action === 'chatStart') {
        // Create a new message element for streaming response
        const streamingMessage = createMessageElement('', false);
        streamingMessage.classList.add('streaming');
        chatMessages.appendChild(streamingMessage);
        scrollToBottom(chatMessages);
    }
    
    if (request.action === 'chatToken') {
        // Update the streaming message content
        const streamingMessage = chatMessages.querySelector('.streaming');
        if (streamingMessage) {
            const content = streamingMessage.querySelector('.message-content');
            content.textContent += request.message;
            scrollToBottom(chatMessages);
        }
    }
    
    if (request.action === 'chatComplete') {
        // Remove streaming class from message
        const streamingMessage = chatMessages.querySelector('.streaming');
        if (streamingMessage) {
            streamingMessage.classList.remove('streaming');
        }
    }
    
    if (request.action === 'chatError') {
        // Remove any streaming message
        const streamingMessage = chatMessages.querySelector('.streaming');
        if (streamingMessage) {
            streamingMessage.remove();
        }
        
        // Add error message
        chatMessages.appendChild(createMessageElement(request.message, false));
        scrollToBottom(chatMessages);
    }
});
