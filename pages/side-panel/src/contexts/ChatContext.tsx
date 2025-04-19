import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { ChatConfig, ChatState, ChatContextValue, Message, ContextMenuAction, ChatMode } from '../types/chat';

// Initial states
const initialChatState: ChatState = {
  messages: [],
  isLoading: false,
  error: null,
};

const initialChatConfig: ChatConfig = {
  mode: 'conversational',
  selectedModel: '',
};

// Action types
type ChatAction =
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<Message> } }
  | { type: 'DELETE_MESSAGE'; payload: string }
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
      // Add unique ID if not already present
      const messageToAdd = action.payload;
      if (!messageToAdd.id) {
        // Generate a unique ID based on role and timestamp or content
        const timestamp = messageToAdd.metadata?.timestamp || Date.now();
        const contentHash = messageToAdd.content.substring(0, 10).replace(/\s+/g, '-');
        const role = messageToAdd.role || 'unknown';
        messageToAdd.id = `${role}-${timestamp}-${contentHash}-${Math.random().toString(36).substring(2, 9)}`;
        console.log('Generated message ID in context:', messageToAdd.id);
      }

      // Check for duplicates by similar IDs before adding
      const isDuplicate = state.messages.some(
        msg =>
          msg.id === messageToAdd.id ||
          (messageToAdd.metadata?.timestamp && msg.metadata?.timestamp === messageToAdd.metadata.timestamp),
      );

      if (isDuplicate) {
        console.log('Duplicate message detected in context, not adding:', messageToAdd.id);
        return state;
      }

      console.log('Adding message to context:', messageToAdd.id);
      return {
        ...state,
        messages: [...state.messages, messageToAdd],
      };

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(message =>
          message.id === action.payload.id
            ? {
                ...message,
                ...action.payload.updates,
                // Properly merge metadata if both exist
                metadata:
                  action.payload.updates.metadata && message.metadata
                    ? { ...message.metadata, ...action.payload.updates.metadata }
                    : action.payload.updates.metadata || message.metadata,
              }
            : message,
        ),
      };

    case 'DELETE_MESSAGE':
      // Mark as deleted (soft delete) or hard delete
      return {
        ...state,
        messages: state.messages.filter(message => message.id !== action.payload),
      };

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
        const userMessage: Message = {
          id: `user-${Date.now()}`,
          role: 'user',
          content,
          metadata: {
            timestamp: Date.now(),
          },
        };
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

  const setMode = useCallback((mode: ChatMode) => {
    setConfig(prev => ({ ...prev, mode }));
  }, []);

  // Add new message to state
  const addMessage = useCallback((message: Message) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message });
  }, []);

  // Update existing message
  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    dispatch({
      type: 'UPDATE_MESSAGE',
      payload: { id, updates },
    });
  }, []);

  // Delete message
  const deleteMessage = useCallback((id: string) => {
    dispatch({ type: 'DELETE_MESSAGE', payload: id });
  }, []);

  // Clear all messages
  const clearMessages = useCallback(() => {
    dispatch({ type: 'SET_MESSAGES', payload: [] });
  }, []);

  const value: ChatContextValue = {
    state,
    config,
    sendMessage,
    setMode,
    updateMessage,
    deleteMessage,
    addMessage,
    clearMessages,
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
