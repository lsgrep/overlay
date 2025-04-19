import { useEffect, useState, useRef, useCallback } from 'react';
import { Languages, HelpCircle, Sparkles, FileText, Pencil, Check, X, ListTodo } from 'lucide-react';

type PopupPosition = {
  top: number;
  left: number;
};

type ToastProps = {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
};

// Simple Toast component for notifications
const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    // Auto-dismiss toast after 3 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-4 right-4 z-[10000] flex items-center rounded-lg shadow-lg px-4 py-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${type === 'success' ? 'bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-100' : 'bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-100'}`}>
      <div className="mr-3">
        {type === 'success' ? (
          <Check size={18} className="text-green-500 dark:text-green-300" />
        ) : (
          <X size={18} className="text-red-500 dark:text-red-300" />
        )}
      </div>
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="ml-4 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Close notification">
        <X size={14} />
      </button>
    </div>
  );
};

type MenuAction = {
  id: string;
  title: string;
  icon: React.ReactNode;
  className?: string;
};

// Define menu actions with Lucid React icons
const MENU_ACTIONS: MenuAction[] = [
  {
    id: 'translate',
    title: 'Translate',
    icon: <Languages size={16} />,
    className: 'text-blue-500',
  },
  {
    id: 'explain',
    title: 'Explain This',
    icon: <HelpCircle size={16} />,
    className: 'text-purple-500',
  },
  {
    id: 'improve',
    title: 'Improve Writing',
    icon: <Sparkles size={16} />,
    className: 'text-amber-500',
  },
  {
    id: 'summarize',
    title: 'Summarize',
    icon: <FileText size={16} />,
    className: 'text-green-500',
  },
  {
    id: 'take-note',
    title: 'Take Note',
    icon: <Pencil size={16} />,
    className: 'text-red-500',
  },
  {
    id: 'create-todo',
    title: 'Create Todo',
    icon: <ListTodo size={16} />,
    className: 'text-teal-500',
  },
];

export default function SelectionPopup() {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<PopupPosition>({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' } | null>(null);
  const selectionRef = useRef<Selection | null>(null);
  const rangeRef = useRef<Range | null>(null);
  // Reference to selection coordinates to improve scroll behavior
  const selectionCoords = useRef<{ x: number; y: number; height: number } | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  // Function to calculate absolute position regardless of scroll
  const calculatePositionFromSelection = useCallback(() => {
    if (!selectionRef.current) return null;

    try {
      const selection = selectionRef.current;
      if (selection.rangeCount === 0) return null;

      const range = selection.getRangeAt(0);
      // Store the range for later use
      rangeRef.current = range;

      // Get the bounding client rect which is relative to the viewport
      const rect = range.getBoundingClientRect();

      if (!rect || rect.width === 0 || rect.height === 0) return null;

      // Store absolute coordinates for more reliable tracking during scroll
      return {
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY,
        height: rect.height,
      };
    } catch (error) {
      console.error('Error calculating selection position:', error);
      return null;
    }
  }, []);

  // Update popup position based on current scroll and stored coordinates
  const updatePopupPosition = useCallback(() => {
    // If we don't have stored coordinates, try to calculate them
    if (!selectionCoords.current) {
      const coords = calculatePositionFromSelection();
      if (!coords) return;
      selectionCoords.current = coords;
    }

    try {
      const { x, y, height } = selectionCoords.current;

      // Calculate popup height approximately based on content
      const popupHeight = 48; // Estimated height of the popup

      // Convert absolute coordinates to viewport-relative coordinates
      const viewportX = x - window.scrollX;
      const viewportY = y - window.scrollY;

      // Position the popup in fixed coordinates (viewport-relative)
      setPosition({
        // Position above the selection with a gap
        top: viewportY - popupHeight - 10,
        left: viewportX + (height > 0 ? height : 20) / 2,
      });
    } catch (error) {
      console.error('Error updating popup position:', error);
      setVisible(false);
    }
  }, [calculatePositionFromSelection]);

  // Handle selection changes
  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();

    if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
      setVisible(false);
      selectionRef.current = null;
      rangeRef.current = null;
      selectionCoords.current = null;
      return;
    }

    try {
      const text = selection.toString().trim();
      setSelectedText(text);

      // Store the selection
      selectionRef.current = selection;

      // Calculate and store absolute coordinates
      selectionCoords.current = calculatePositionFromSelection();
      if (!selectionCoords.current) {
        setVisible(false);
        return;
      }

      // Update the popup position
      updatePopupPosition();
      setVisible(true);
    } catch (error) {
      console.error('Error handling selection:', error);
      setVisible(false);
    }
  }, [updatePopupPosition, calculatePositionFromSelection]);

  // Small delay to ensure accurate selection before showing popup
  const handleSelection = useCallback(() => {
    setTimeout(handleSelectionChange, 50);
  }, [handleSelectionChange]);

  useEffect(() => {
    // Handle clicks outside the popup
    const handleClick = (e: MouseEvent) => {
      const popup = document.getElementById('selection-popup');
      if (popup && !popup.contains(e.target as Node)) {
        setVisible(false);
      }
    };

    // Handle scroll events to update the popup position
    const handleScroll = () => {
      if (visible && selectionCoords.current) {
        requestAnimationFrame(() => {
          updatePopupPosition();
        });
      }
    };

    // Using mouseup is better for detecting selection completion
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('click', handleClick);
    document.addEventListener('keyup', handleSelection);

    // Add scroll listeners for both window and document
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });

    // Also handle resize events which might affect positioning
    window.addEventListener('resize', updatePopupPosition);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keyup', handleSelection);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updatePopupPosition);
    };
  }, [handleSelection, updatePopupPosition, visible]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({
      visible: true,
      message,
      type,
    });
  };

  const closeToast = () => {
    setToast(null);
  };

  // Set up listener for note/todo action confirmations
  useEffect(() => {
    interface ActionResult {
      type: string;
      success: boolean;
      error?: string;
    }

    const handleMessage = (message: ActionResult) => {
      if (message.type === 'NOTE_SAVE_RESULT') {
        if (message.success) {
          showToast('Note saved successfully', 'success');
        } else {
          showToast(`Failed to save note: ${message.error || 'Unknown error'}`, 'error');
        }
      } else if (message.type === 'TODO_CREATE_RESULT') {
        if (message.success) {
          showToast('Todo created successfully', 'success');
        } else {
          showToast(`Failed to create todo: ${message.error || 'Unknown error'}`, 'error');
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const handleActionClick = async (actionId: string) => {
    // Find the selected action
    const action = MENU_ACTIONS.find(a => a.id === actionId);
    if (!action || !selectedText) return;

    // Open side panel for all actions except take-note

    await chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
    await chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });

    // Send the action to the side panel
    setTimeout(async () => {
      try {
        await chrome.runtime.sendMessage(
          {
            type: 'CONTEXT_MENU_ACTION',
            actionId,
            text: selectedText,
            url: window.location.href,
          },
          response => {
            // Handle direct response (for browsers that support it)
            if (actionId === 'take-note' && response) {
              if (response.success) {
                showToast('Note saved successfully', 'success');
              } else {
                showToast(`Failed to save note: ${response.error || 'Unknown error'}`, 'error');
              }
            }
          },
        );
      } catch (error) {
        console.error('Error sending message:', error);
        if (actionId === 'take-note') {
          showToast('Failed to send note', 'error');
        }
      }
      setVisible(false);
    }, 500);
  };

  return (
    <>
      {visible && (
        <div
          id="selection-popup"
          ref={popupRef}
          className="fixed z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-border transform -translate-x-1/2 flex flex-col"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            pointerEvents: 'auto', // Ensure the popup can receive events
          }}>
          <div className="flex flex-row">
            {MENU_ACTIONS.map(action => (
              <button
                key={action.id}
                className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors duration-200 ${action.className || ''}`}
                onClick={() => handleActionClick(action.id)}
                title={action.title}
                aria-label={action.title}>
                <span className="sr-only">{action.title}</span>
                {action.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {toast?.visible && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </>
  );
}
