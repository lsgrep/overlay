import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
// import './App.css'

interface ChromeMessage {
  action: 'toggleSidebar';
}

function App() {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  useEffect(() => {
    // Listen for toggle message from background script
    chrome.runtime.onMessage.addListener((message: ChromeMessage) => {
      if (message.action === 'toggleSidebar') {
        setIsSidebarVisible(prev => !prev);
        return true;
      }
    });
  }, []);

  // Update container class when sidebar visibility changes
  useEffect(() => {
    const container = document.getElementById('chrome-extension-container');
    if (container) {
      container.classList.toggle('sidebar-visible', isSidebarVisible);
    }
  }, [isSidebarVisible]);

  return (
    <Sidebar 
      isVisible={isSidebarVisible} 
      onClose={() => setIsSidebarVisible(false)} 
    />
  )
}

export default App
