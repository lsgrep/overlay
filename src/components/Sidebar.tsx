import { useState, useEffect, useRef } from 'react';
import './Sidebar.css';

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isVisible, onClose }: SidebarProps) => {
  const [messages, setMessages] = useState<Array<{ text: string; isUser: boolean }>>([]);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');

  const scrollToBottom = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  };

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      setMessages(prev => [...prev, { text: inputValue, isUser: true }]);
      setInputValue('');
      // TODO: Add API call to handle chat response
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div id="chrome-extension-container" className={isVisible ? 'sidebar-visible' : ''}>
      <div id="chrome-extension-wrapper">
        {/* This will contain the page content */}
      </div>
      <div id="chrome-extension-sidebar">
        <div className="sidebar-header">
          <h2>Local Chat</h2>
          <div className="header-buttons">
            <button id="get-content" title="Get page content" className="context-inactive">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
            </button>
            <button id="reset-chat" title="Reset conversation">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
            </button>
            <button onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="chat-messages" ref={chatMessagesRef}>
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.isUser ? 'user' : 'assistant'}`}>
              <div className="message-content">{msg.text}</div>
              <div className="message-time">
                {new Date().toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: 'numeric',
                  hour12: true 
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="chat-input-container">
          <textarea
            className="chat-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
          />
        </div>
      </div>
    </div>
  );
};
