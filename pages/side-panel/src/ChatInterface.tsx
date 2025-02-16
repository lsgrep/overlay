import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { TaskPlanView } from './components/TaskPlanView';
import { getGeminiKey } from '@extension/storage';
import { retry } from './utils/retry';
import { PromptManager } from './services/llm/prompt';
import { GeminiService } from './services/llm/gemini';
import { OllamaService } from './services/llm/ollama';

interface Message {
  role: string;
  content: string;
}

interface TaskStep {
  description: string;
  action: 'click' | 'type' | 'navigate' | 'wait' | 'extract';
  target?: string;
  value?: string;
  selector?: string;
}

interface TaskPlan {
  goal: string;
  steps: TaskStep[];
  estimated_time: string;
}

interface ChatInterfaceProps {
  selectedModel: string;
  isLight: boolean;
  mode: 'interactive' | 'conversational' | 'context-menu';
  initialInput?: string;
}

const API_URL = 'http://localhost:11434/api/chat';

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ selectedModel, isLight, mode, initialInput }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialInput || '');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (initialInput) {
      setInput(initialInput);
      // Auto-submit for context-menu mode
      if (mode === 'context-menu') {
        const event = new Event('submit') as any;
        handleSubmit(event);
      }
    }
  }, [initialInput, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Create the display message (without page content)
    const displayMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, displayMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);
    console.log('Debug: Submitting chat:', { input, selectedModel, mode });
    try {
      console.log('current model:', selectedModel);

      // Extract page context
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      let currentContent = '';
      if (tab?.id) {
        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => document.body.innerText,
        });
        console.log('Debug: Retrieved page content:', result);
        if (result?.result) {
          currentContent = result.result;
        }
      }

      const pageContext = {
        title: tab?.title,
        url: tab?.url,
        content: currentContent,
      };

      // Generate prompt using PromptManager
      const prompt = PromptManager.generateContext(mode, pageContext);

      console.log('Debug: Generated prompt:', prompt);

      // Instantiate required LLM service
      let llmService;
      if (selectedModel.includes('gemini')) {
        llmService = new GeminiService(selectedModel);
      } else {
        llmService = new OllamaService(selectedModel, API_URL);
      }

      // Get completion
      const completion = await llmService.generateCompletion(
        messages.concat({ role: 'user', content: input }),
        prompt,
        undefined,
        mode,
      );
      setMessages(prev => [...prev, { role: 'assistant', content: completion }]);
    } catch (err) {
      console.error('Error in chat:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
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
              {mode === 'interactive' && message.role === 'assistant' ? (
                <div className="space-y-2">
                  {(() => {
                    try {
                      const plan: TaskPlan = JSON.parse(message.content);
                      return <TaskPlanView plan={plan} isLight={isLight} />;
                    } catch {
                      // If not a valid TaskPlan JSON, try to format as regular JSON
                      try {
                        const json = JSON.parse(message.content);
                        return (
                          <pre
                            className={`whitespace-pre-wrap overflow-x-auto p-2 rounded text-sm ${isLight ? 'bg-gray-100' : 'bg-gray-800'}`}>
                            {JSON.stringify(json, null, 2)}
                          </pre>
                        );
                      } catch {
                        // If not JSON at all, render as markdown
                        return <ReactMarkdown>{message.content}</ReactMarkdown>;
                      }
                    }
                  })()}
                </div>
              ) : (
                <ReactMarkdown>{message.content}</ReactMarkdown>
              )}
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
