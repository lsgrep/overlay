import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { ChatConfig, ChatState, ChatContextValue, Message, ContextMenuAction, ChatMode } from '../types/chat';

// Initial states
const initialChatState: ChatState = {
  messages: [],
  isLoading: false,
  error: null,
};

const initialChatConfig: ChatConfig = {
  mode: 'conversational',
  selectedModel: '',
  contextMenuAction: undefined,
};

// Action types
type ChatAction =
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_MODE'; payload: ChatMode }
  | { type: 'SET_CONTEXT_MENU_ACTION'; payload: ContextMenuAction | undefined };

// Reducer
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

// Create context
const ChatContext = createContext<ChatContextValue | undefined>(undefined);

// Provider component
export const ChatProvider: React.FC<{
  children: React.ReactNode;
  initialConfig: Partial<ChatConfig>;
}> = ({ children, initialConfig }) => {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const [config, setConfig] = React.useState<ChatConfig>({
    ...initialChatConfig,
    ...initialConfig,
  });

  const sendMessage = useCallback(
    async (content: string) => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });

        // Add user message
        const userMessage: Message = { role: 'user', content };
        dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

        // TODO: Implement API call based on mode and model
        // This will be implemented in the ChatInterface component
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [config],
  );

  const setContextMenuAction = useCallback((action: ContextMenuAction | undefined) => {
    setConfig(prev => ({ ...prev, contextMenuAction: action }));
  }, []);

  const setMode = useCallback((mode: ChatMode) => {
    setConfig(prev => ({ ...prev, mode }));
  }, []);

  const value: ChatContextValue = {
    state,
    config,
    sendMessage,
    setContextMenuAction,
    setMode,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// Hook for using the chat context
export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
