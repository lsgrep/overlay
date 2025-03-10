import type React from 'react';
import { t } from '@extension/i18n';
import { Button, Textarea } from '@extension/ui';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  fontFamily: string;
  fontSize: number;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  handleSubmit,
  isLoading,
  fontFamily,
  fontSize,
}) => {
  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-border">
      <div className="flex space-x-2">
        <Textarea
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
          placeholder={t('sidepanel_message_placeholder')}
          style={{ fontFamily, fontSize: `${fontSize}px` }}
          className="flex-1 min-h-[40px] max-h-[200px] resize-none"
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
