import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: string;
  content: string;
}

interface ChatInterfaceProps {
  selectedModel: string;
  isLight: boolean;
  mode: 'interactive' | 'conversational';
}

const API_URL = 'http://localhost:11434/api/chat';

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ selectedModel, isLight, mode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Create the display message (without page content)
    const displayMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, displayMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Get current tab and its content
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      let currentContent = '';
      if (tab?.id) {
        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => document.body.innerText,
        });
        if (result?.result) {
          currentContent = result.result;
        }
      }

      // Create the full context for Ollama
      let context = '';
      if (tab?.title || tab?.url) {
        context += `Current page: ${tab.title || ''} ${tab.url ? `(${tab.url})` : ''}\n\n`;
      }
      if (currentContent) {
        context += `Page content:\n${currentContent}\n\n`;
      }

      // Add mode-specific context
      if (mode === 'interactive') {
        context += `You are in interactive mode. You can help manipulate and interact with the page. Feel free to suggest actions like clicking buttons, filling forms, or navigating.\n\n`;
      } else {
        context += `You are in conversational mode. Please focus on answering questions about the page content without suggesting interactive actions.\n\n`;
      }

      // Send the full context to Ollama
      const userMessage: Message = { role: 'user', content: `${context}${input}` };

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [...messages, userMessage],
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let fullResponse = '';
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              fullResponse += data.message.content;
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.role === 'assistant') {
                  lastMessage.content = fullResponse;
                  return [...newMessages];
                } else {
                  return [...newMessages, { role: 'assistant', content: fullResponse }];
                }
              });
            }
          } catch (e) {
            console.error('Error parsing JSON:', e, line);
          }
        }
      }
    } catch (err: any) {
      console.error('Error in chat:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg ${
              message.role === 'user'
                ? `${isLight ? 'bg-blue-100' : 'bg-blue-900'} ml-4`
                : `${isLight ? 'bg-gray-100' : 'bg-gray-700'} mr-4`
            }`}>
            <div className={`text-xs font-semibold mb-1 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
              {message.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div className={isLight ? 'text-gray-800' : 'text-gray-100'}>
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className={`flex justify-center py-2 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
            <div className="animate-bounce mx-1">●</div>
            <div className="animate-bounce mx-1 delay-100">●</div>
            <div className="animate-bounce mx-1 delay-200">●</div>
          </div>
        )}
        {error && (
          <div className="text-red-500 p-3 rounded-lg bg-red-100 mr-4">
            <div className="text-xs font-semibold mb-1">Error</div>
            <div>{error}</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..."
            className={`flex-1 p-2 rounded-lg border ${
              isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-white'
            }`}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={`px-4 py-2 rounded-lg ${
              isLoading || !input.trim()
                ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}>
            Send
          </button>
        </div>
      </form>
    </div>
  );
};
