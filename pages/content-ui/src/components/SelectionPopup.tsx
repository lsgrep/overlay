import { useEffect, useState, useRef, useCallback } from 'react';

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
      ref={popupRef}
      className="fixed z-[9999] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 transform -translate-x-1/2 flex flex-col"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        pointerEvents: 'auto', // Ensure the popup can receive events
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
