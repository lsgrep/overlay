console.log('Content script loaded - v5');

// Create and inject the sidebar
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
    
    // Create wrapper for the main content
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
            <h2>My Tasks</h2>
            <button id="close-sidebar">×</button>
        </div>
        <div class="task-list">
            <div class="task-item">
                <div class="task-checkbox"></div>
                <div class="task-content">
                    <p class="task-title">Create an audio helper</p>
                    <a href="https://github.com/ggerganov/whisper.cpp" class="task-link">https://github.com/ggerganov/whisper.cpp</a>
                </div>
            </div>
            <div class="task-item">
                <div class="task-checkbox"></div>
                <div class="task-content">
                    <p class="task-title">One meditation session</p>
                </div>
            </div>
            <div class="task-item">
                <div class="task-checkbox"></div>
                <div class="task-content">
                    <p class="task-title">Health check for driving license</p>
                </div>
            </div>
        </div>
        <div class="completed-section">
            Completed (13)
        </div>
    `;

    // Add event listeners
    document.getElementById('close-sidebar').addEventListener('click', () => {
        console.log('Close button clicked');
        toggleSidebar(false);
    });

    sidebar.querySelectorAll('.task-checkbox').forEach(checkbox => {
        checkbox.addEventListener('click', function() {
            this.style.backgroundColor = this.style.backgroundColor ? '' : '#0d6efd';
            this.style.borderColor = this.style.backgroundColor ? '#adb5bd' : '#0d6efd';
        });
    });

    // Set initial state
    toggleSidebar(true);
}

function toggleSidebar(show) {
    const container = document.getElementById('chrome-extension-container');
    if (container) {
        container.classList.toggle('sidebar-visible', show);
        console.log('Sidebar visibility:', show);
    }
}

// Initialize the sidebar
function initialize() {
    console.log('Initializing sidebar');
    if (document.body) {
        createSidebar();
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
