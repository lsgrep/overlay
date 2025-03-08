import { useEffect, useState } from 'react';

type PopupPosition = {
  top: number;
  left: number;
};

// Define menu actions directly in this component to avoid import issues
const MENU_ACTIONS = [
  {
    id: 'translate',
    title: 'Translate',
    icon: '🔄',
  },
  {
    id: 'explain',
    title: 'Explain This',
    icon: '🤖',
  },
  {
    id: 'improve',
    title: 'Improve Writing',
    icon: '✨',
  },
  {
    id: 'summarize',
    title: 'Summarize',
    icon: '📋',
  },
  {
    id: 'take-note',
    title: 'Take Note',
    icon: '📝',
  },
];

export default function SelectionPopup() {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<PopupPosition>({ top: 0, left: 0 });
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    // Function to handle text selection
    const handleSelectionChange = () => {
      const selection = window.getSelection();

      if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
        setVisible(false);
        return;
      }

      const text = selection.toString().trim();
      setSelectedText(text);

      // Get position from the selection
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Calculate popup height approximately based on content
      const popupHeight = 48; // Estimated height of the popup

      // Position the popup above the selection with proper spacing
      setPosition({
        top: window.scrollY + rect.top - popupHeight - 10, // Position above with a 10px gap
        left: window.scrollX + rect.left + rect.width / 2,
      });

      setVisible(true);
    };

    // Small delay to ensure accurate selection before showing popup
    const handleSelection = () => {
      setTimeout(handleSelectionChange, 50);
    };

    const handleClick = (e: MouseEvent) => {
      // Hide popup when clicking outside
      const popup = document.getElementById('selection-popup');
      if (popup && !popup.contains(e.target as Node)) {
        setVisible(false);
      }
    };

    // Using mouseup is better for detecting selection completion
    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('click', handleClick);
    document.addEventListener('keyup', handleSelection);

    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keyup', handleSelection);
    };
  }, []);

  const handleActionClick = async (actionId: string) => {
    // Find the selected action
    const action = MENU_ACTIONS.find(a => a.id === actionId);
    if (!action || !selectedText) return;

    // Open side panel
    await chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });

    // Send the action to the side panel
    setTimeout(async () => {
      try {
        await chrome.runtime.sendMessage({
          type: 'CONTEXT_MENU_ACTION',
          actionId,
          text: selectedText,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }, 500);

    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      id="selection-popup"
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 transform -translate-x-1/2 flex flex-col"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}>
      <div className="flex flex-row space-x-1">
        {MENU_ACTIONS.map(action => (
          <button
            key={action.id}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center justify-center"
            onClick={() => handleActionClick(action.id)}
            title={action.title}>
            {action.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
