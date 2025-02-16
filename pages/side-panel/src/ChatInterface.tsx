import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { TaskPlanView } from './components/TaskPlanView';
import { getGeminiKey } from '@extension/storage';
import { retry } from './utils/retry';

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
      let context = `
You are an AI assistant that helps users interact with web pages. When appropriate, generate a task plan with specific actions. Use these actions:
- 'search': Perform a Google search (requires query parameter)
- 'click': Click on an element (requires target selector)
- 'type': Type text into a form field (requires target selector and value)
- 'navigate': Navigate to a URL (requires target URL)
- 'wait': Wait for a specific condition or time
- 'extract': Extract information from the page

Example response format:
{
  "goal": "Find the current price of gold",
  "steps": [
    {
      "description": "Search for gold price",
      "action": "search",
      "query": "current price of gold per ounce"
    },
    {
      "description": "Extract price information",
      "action": "extract",
      "target": ".g .price"
    }
  ],
  "estimated_time": "10 seconds"
}`;
      if (tab?.title || tab?.url) {
        context += `Current page: ${tab.title || ''} ${tab.url ? `(${tab.url})` : ''}\n\n`;
      }
      if (currentContent) {
        context += `Page content:\n${currentContent}\n\n`;
      }

      if (mode === 'interactive') {
        context += `You are in interactive mode. Generate a task plan with specific steps to help the user achieve their goal.

For any information seeking tasks, use the 'search' action directly with a specific query. For example:
{
  "goal": "Find the current price of gold",
  "steps": [
    {
      "description": "Search for gold price",
      "action": "search",
      "query": "current price of gold per ounce"
    }
  ]
}

Current page URL: ${window.location.href}

`;
      } else {
        context += `You are in conversational mode. Focus on answering questions about the page content without suggesting interactive actions.

`;
      }

      // Add mode-specific context and format
      // Add mode-specific context
      if (mode === 'interactive') {
        context += `You are in interactive mode. You will help manipulate and interact with the page by providing a structured plan. Please analyze the task and break it down into clear steps.\n\n`;
      } else {
        context += `You are in conversational mode. Please focus on answering questions about the page content without suggesting interactive actions.\n\n`;
      }

      console.log('Debug: Chat context:', context);
      console.log('current model:', selectedModel);

      if (selectedModel.includes('gemini')) {
        // Get Gemini API key
        const geminiKey = await getGeminiKey();
        if (!geminiKey) {
          throw new Error('Gemini API key not found');
        }

        console.log('Debug: Got Gemini key:', geminiKey);

        // Ensure we have the full model path
        const modelName = selectedModel.includes('/') ? selectedModel : `models/${selectedModel}`.replace('//', '/');

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${geminiKey}`;

        const requestBody = {
          contents: messages.concat({ role: 'user', content: `${context}${input}` }).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
          })),
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE',
            },
          ],
        };

        console.log('Debug: Sending request to Gemini:', {
          url: apiUrl.replace(geminiKey, '[REDACTED]'),
          body: requestBody,
        });

        let response;
        let retryCount = 0;
        const maxRetries = 3;
        const baseDelay = 1000;

        while (retryCount < maxRetries) {
          try {
            response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });

            if (response.ok) {
              break;
            }

            const errorText = await response.text();
            const error = new Error(`Gemini API error: ${response.status} - ${errorText}`);

            // Only retry on rate limit errors
            if (response.status !== 429 && !errorText.includes('RESOURCE_EXHAUSTED')) {
              throw error;
            }

            retryCount++;
            if (retryCount === maxRetries) {
              throw error;
            }

            const delay = baseDelay * Math.pow(2, retryCount - 1);
            console.log(`Attempt ${retryCount} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } catch (error: any) {
            if (
              retryCount === maxRetries ||
              (!error.message?.includes('429') && !error.message?.includes('RESOURCE_EXHAUSTED'))
            ) {
              console.error('Gemini API Error:', error);
              setError(error.message || 'Failed to call Gemini API');
              setIsLoading(false);
              return;
            }
          }
        }

        console.log('Debug: Gemini API call successful');

        const data = await response.json();
        console.log('Debug: Gemini response:', data);

        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
        setMessages(prev => [...prev, { role: 'assistant', content }]);
      } else {
        // Handle Ollama chat
        const requestBody = {
          model: selectedModel,
          messages: [...messages, { role: 'user', content: `${context}${input}` }],
          stream: true,
          format:
            mode === 'interactive'
              ? {
                  type: 'object',
                  properties: {
                    goal: { type: 'string' },
                    steps: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          description: { type: 'string' },
                          action: { type: 'string', enum: ['click', 'type', 'navigate', 'wait', 'extract'] },
                          target: { type: 'string', optional: true },
                          value: { type: 'string', optional: true },
                          selector: { type: 'string', optional: true },
                        },
                        required: ['description', 'action'],
                      },
                    },
                    estimated_time: { type: 'string' },
                  },
                  required: ['goal', 'steps', 'estimated_time'],
                }
              : undefined,
        };

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
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
          const lines = chunk.split('\n');

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
      }
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
