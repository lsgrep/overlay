import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import './App.css'

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

  return (
    <Sidebar 
      isVisible={isSidebarVisible} 
      onClose={() => setIsSidebarVisible(false)} 
    />
  )
}

export default App
