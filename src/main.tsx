import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// Create root element and append to body
const root = document.createElement('div');
root.id = 'crx-root';
document.body.appendChild(root);

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
