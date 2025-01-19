import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Function to get the main content of the page
export function getPageContent() {
  // Get the article content if it exists
  const article = document.querySelector('article');
  if (article) return article.textContent || '';

  // Get the main content if it exists
  const main = document.querySelector('main');
  if (main) return main.textContent || '';

  // Get all paragraph text if no article/main
  const paragraphs = Array.from(document.querySelectorAll('p'));
  if (paragraphs.length > 0) {
    return paragraphs.map(p => p.textContent).join('\n');
  }

  // Fallback to body text, excluding scripts and styles
  const body = document.body;
  const clone = body.cloneNode(true) as HTMLElement;
  const scripts = clone.getElementsByTagName('script');
  const styles = clone.getElementsByTagName('style');
  
  // Remove scripts and styles
  while (scripts[0]) scripts[0].parentNode?.removeChild(scripts[0]);
  while (styles[0]) styles[0].parentNode?.removeChild(styles[0]);
  
  return clone.textContent || '';
}

// Create container
const container = document.createElement('div');
container.id = 'chrome-extension-container';

// Create wrapper
const wrapper = document.createElement('div');
wrapper.id = 'chrome-extension-wrapper';

// Move all existing body content to wrapper
while (document.body.firstChild) {
  wrapper.appendChild(document.body.firstChild);
}

// Set up structure
container.appendChild(wrapper);
document.body.appendChild(container);

// Create root element for React app
const root = document.createElement('div');
root.id = 'crx-root';
container.appendChild(root);

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'toggleSidebar') {
    const content = getPageContent();
    // Send the page content as context
    chrome.runtime.sendMessage({ 
      action: 'updateContext', 
      context: content 
    });
  } else if (message.action === 'getPageContent') {
    const content = getPageContent();
    // Send the page content as context
    chrome.runtime.sendMessage({ 
      action: 'updateContext', 
      context: content 
    });
  }
});
