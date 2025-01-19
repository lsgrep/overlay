import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

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
