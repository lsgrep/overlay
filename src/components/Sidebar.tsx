import { useState, useEffect, useRef } from 'react';
import './Sidebar.css';
import { getPageContent } from '../main';
import ReactMarkdown from 'react-markdown';

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

interface Model {
  id: string;
}

export const Sidebar = ({ isVisible, onClose }: SidebarProps) => {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('phi4');
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Get current page content before sending each message
    const content = getPageContent();
    chrome.runtime.sendMessage({ 
      action: 'updateContext', 
      context: content 
    });

    const newMessage = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      chrome.runtime.sendMessage({
        action: 'chat',
        messages: [...messages, newMessage]
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleModelChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedModel = event.target.value;
    console.log('Selected model:', selectedModel);
    localStorage.setItem('selectedModel', selectedModel);
    setSelectedModel(selectedModel);
    
    // Add system message about model change
    const systemMessage = { 
      role: 'system', 
      content: `Switched to ${selectedModel} model` 
    };
    setMessages(prev => [...prev, systemMessage]);
    
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
  };

  // Handle chat messages from background script
  useEffect(() => {
    const messageListener = (message: any) => {
      if (message.action === 'chatStart') {
        setIsTyping(true);
        setCurrentResponse('');
      }
      else if (message.action === 'chatToken') {
        setCurrentResponse(prev => prev + message.message);
      }
      else if (message.action === 'chatComplete') {
        setIsTyping(false);
        setMessages(prev => [...prev, { role: 'assistant', content: message.message }]);
        setCurrentResponse('');
      }
      else if (message.action === 'chatError') {
        setIsTyping(false);
        setMessages(prev => [...prev, { role: 'system', content: `Error: ${message.error}` }]);
        setCurrentResponse('');
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  // Fetch models on mount
  useEffect(() => {
    const loadModels = async () => {
      const fetchedModels = await fetchModels();
      setModels(fetchedModels);
      
      // Restore previously selected model if any
      const savedModel = localStorage.getItem('selectedModel');
      if (savedModel) {
        setSelectedModel(savedModel);
      }
    };
    loadModels();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse]);

  // Update body margin when sidebar visibility changes
  useEffect(() => {
    document.body.style.marginRight = isVisible ? '300px' : '0';
    return () => {
      document.body.style.marginRight = '0';
    };
  }, [isVisible]);

  // Load conversation history
  useEffect(() => {
    chrome.runtime.sendMessage({ action: 'getHistory' }, (response) => {
      if (response?.history) {
        setMessages(response.history);
      }
    });
  }, []);

  const fetchModels = async () => {
    try {
      console.log('Requesting models from background script...');
      const response = await chrome.runtime.sendMessage({
        action: 'fetchModels'
      });
      console.log('Received models from background:', response);
      return response.models || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  };

  return (
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
      
      <div className="model-selector">
        <select 
          id="modelSelect" 
          className="model-dropdown"
          value={selectedModel}
          onChange={handleModelChange}
        >
          {models.length === 0 ? (
            <option value="">Loading models...</option>
          ) : (
            models.map(model => (
              <option key={model.id} value={model.id}>
                {model.id}
              </option>
            ))
          )}
        </select>
      </div>
      
      <div className="chat-messages" ref={chatMessagesRef}>
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'assistant' : 'system'}`}>
            <div className="message-content">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
            <div className="message-time">
              {new Date().toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: 'numeric',
                hour12: true 
              })}
            </div>
          </div>
        ))}
        {isTyping && currentResponse && (
          <div className="message assistant">
            <div className="message-content">
              <ReactMarkdown>{currentResponse}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-container">
        <form onSubmit={handleSubmit}>
          <textarea
            className="chat-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
          />
          <button 
            className="send-button" 
            type="submit"
            disabled={!inputValue.trim()}
          >
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};
