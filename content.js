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
                <button id="reset-chat" title="Reset conversation">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                    </svg>
                </button>
                <button id="close-sidebar">×</button>
            </div>
        </div>
        <div class="chat-container">
            <div class="chat-messages">
                <div class="message assistant">
                    <div class="message-content">Hello! I'm your Llama2-powered AI assistant. How can I help you today?</div>
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
function initialize() {
    console.log('Initializing sidebar');
    if (document.body) {
        createSidebar();
        
        // Watch for dynamic content changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && !document.getElementById('chrome-extension-container')) {
                    console.log('Page content changed, reinitializing sidebar');
                    createSidebar();
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    } else {
        document.addEventListener('DOMContentLoaded', createSidebar);
    }
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
