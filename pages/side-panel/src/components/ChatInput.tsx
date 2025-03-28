import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { t } from '@extension/i18n';
import { Button, Textarea } from '@extension/ui';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

// Interface for dragged image data
interface DraggedImage {
  url: string;
  altText?: string;
}

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  fontFamily: string;
  fontSize: number;
  draggedImages?: DraggedImage[];
  setDraggedImages?: React.Dispatch<React.SetStateAction<DraggedImage[]>>;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  handleSubmit,
  isLoading,
  fontFamily,
  fontSize,
  draggedImages: externalDraggedImages,
  setDraggedImages: externalSetDraggedImages,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [localDraggedImages, setLocalDraggedImages] = useState<DraggedImage[]>([]);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Use either external or local state for dragged images
  const draggedImages = externalDraggedImages || localDraggedImages;
  const setDraggedImages = externalSetDraggedImages || setLocalDraggedImages;
  // Handle drag events
  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);

    // Log all available data formats
    console.log('Available data formats:');
    for (let i = 0; i < e.dataTransfer.types.length; i++) {
      console.log(`- ${e.dataTransfer.types[i]}`);
    }
    const imageUrl =
      e.dataTransfer.getData('text/uri-list') ||
      e.dataTransfer.getData('overlay/image') ||
      e.dataTransfer.getData('text/plain');

    console.log('Detected image URL:', imageUrl);

    // Validate that it's an image URL
    if (isValidImageUrl(imageUrl)) {
      console.log('URL validated as an image');
      // Add to dragged images
      setDraggedImages([...draggedImages, { url: imageUrl }]);

      // Don't insert markdown into input text anymore
      // Just add the image to draggedImages array, which has already been done above
      console.log('Image added to draggedImages without modifying input text');
    } else if (imageUrl) {
      console.log('URL failed validation as an image:', imageUrl);
    } else {
      console.log('No URL found in drop event');
    }
  };

  // Helper function to validate image URLs
  const isValidImageUrl = (url: string): boolean => {
    if (!url) return false;

    try {
      const parsedUrl = new URL(url);
      const path = parsedUrl.pathname.toLowerCase();
      return (
        (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') &&
        (path.endsWith('.jpg') ||
          path.endsWith('.jpeg') ||
          path.endsWith('.png') ||
          path.endsWith('.gif') ||
          path.endsWith('.webp') ||
          path.endsWith('.svg') ||
          // Allow image URLs without file extensions (common with CDNs)
          url.includes('image') ||
          url.includes('img'))
      );
    } catch {
      return false;
    }
  };

  // Clear images when input is sent
  useEffect(() => {
    if (!input) {
      setDraggedImages([]);
    }
  }, [input, setDraggedImages]);

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-border">
      {/* Image thumbnails count indicator - only show if there are images */}
      {draggedImages.length > 0 && (
        <div className="mb-2 text-xs text-gray-500">
          {draggedImages.length} image{draggedImages.length > 1 ? 's' : ''} attached
        </div>
      )}
      {draggedImages.length > 0 && (
        <div className="mb-2 flex flex-col gap-2">
          {draggedImages.map((img, index) => (
            <div key={index} className="relative group border border-gray-300 p-2 rounded">
              <div className="flex">
                <img
                  src={img.url}
                  alt={img.altText || 'Dragged image'}
                  className="w-16 h-16 object-cover rounded border border-border"
                  onError={e => {
                    // Show error if image fails to load
                    const imgElement = e.currentTarget as HTMLImageElement;
                    imgElement.style.display = 'none';
                    const errorElement = imgElement.nextElementSibling as HTMLDivElement;
                    if (errorElement) {
                      errorElement.style.display = 'flex';
                    }
                  }}
                />
                <div className="hidden w-16 h-16 items-center justify-center bg-red-100 text-red-800 text-xs rounded border border-red-300">
                  Error loading image
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  // Remove image from state
                  const newImages = [...draggedImages];
                  newImages.splice(index, 1);
                  setDraggedImages(newImages);

                  // Remove the markdown image from input
                  const markdownToRemove = `![image](${img.url}) `;
                  setInput(input.replace(markdownToRemove, ''));
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex space-x-2">
        <Textarea
          ref={textAreaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (input.trim() && !isLoading) {
                handleSubmit(e);
              }
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          placeholder={isDraggingOver ? 'Drop image here...' : t('sidepanel_message_placeholder')}
          style={{ fontFamily, fontSize: `${fontSize}px` }}
          className={`flex-1 min-h-[40px] max-h-[200px] resize-none ${isDraggingOver ? 'border-2 border-dashed border-primary' : ''}`}
          disabled={isLoading}
        />
        <Button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{ fontFamily, fontSize: `${fontSize}px` }}
          className="flex items-center gap-2"
          variant="default">
          <span>{t('sidepanel_send')}</span>
          <PaperAirplaneIcon className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
};
