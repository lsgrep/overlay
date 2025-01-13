console.log('Content script loaded - v7');

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
            <h2>Chat Assistant</h2>
            <button id="close-sidebar">×</button>
        </div>
        <div class="chat-container">
            <div class="chat-messages">
                <div class="message assistant">
                    <div class="message-content">Hello! How can I help you today?</div>
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
    function sendMessage() {
        const text = chatInput.value.trim();
        if (text) {
            // Add user message
            chatMessages.appendChild(createMessageElement(text, true));
            chatInput.value = '';
            scrollToBottom(chatMessages);

            // Simulate assistant response
            setTimeout(() => {
                const response = "I'm a chat assistant. I can help you with various tasks. What would you like to know?";
                chatMessages.appendChild(createMessageElement(response, false));
                scrollToBottom(chatMessages);
            }, 1000);
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

    // Set initial state
    toggleSidebar(true);
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

// Listen for toggle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request);
    if (request.action === 'toggleSidebar') {
        toggleSidebar(request.state);
    }
});
