import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { t } from '@extension/i18n';
import { Button, Textarea } from '@extension/ui';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { useStorage } from '@extension/shared';
import { defaultLanguageStorage } from '@extension/storage';

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
  const defaultLanguage = useStorage(defaultLanguageStorage);

  // Update translations when language changes
  useEffect(() => {
    if (defaultLanguage) {
      // @ts-expect-error - DevLocale type not available from @extension/i18n
      t.devLocale = defaultLanguage;
      console.log('ChatInput: Language set to', defaultLanguage);
    }
  }, [defaultLanguage]);

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
    <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-background">
      {/* Image thumbnails gallery - only show if there are images */}
      {draggedImages.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-muted-foreground font-medium mb-2">
            {t('sidepanel_images_attached', '{count} image(s) attached', { count: draggedImages.length })}
          </div>
          <div className="flex flex-wrap gap-2">
            {draggedImages.map((img, index) => (
              <div key={index} className="relative group rounded-md overflow-hidden shadow-sm">
                <div className="flex">
                  <img
                    src={img.url}
                    alt={img.altText || 'Attached image'}
                    className="w-16 h-16 object-cover"
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
                  <div className="hidden w-16 h-16 items-center justify-center bg-red-100 text-red-800 text-xs">
                    {t('sidepanel_image_error', 'Error loading image')}
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
                  className="absolute top-0 right-0 bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-white rounded-bl-md w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  ×
                </button>
              </div>
            ))}
          </div>
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
          className={`flex-1 min-h-[40px] max-h-[200px] resize-none bg-background shadow-sm focus-visible:ring-primary ${
            isDraggingOver ? 'border-2 border-dashed border-primary bg-primary/5' : ''
          }`}
          disabled={isLoading}
        />
        <Button
          type="submit"
          disabled={isLoading || !input.trim()}
          style={{ fontFamily, fontSize: `${fontSize}px` }}
          className="flex items-center gap-2 h-auto"
          variant="default">
          <PaperAirplaneIcon className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
};
