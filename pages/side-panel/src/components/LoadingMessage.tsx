import type React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import { t } from '@extension/i18n';

export const LoadingMessage: React.FC = () => {
  return (
    <div className="relative flex items-start gap-2">
      {/* Loading avatar/icon */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center
        bg-muted-foreground/10 animate-pulse">
        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 opacity-70" />
      </div>

      {/* Loading message content */}
      <div className="flex-1 p-3 mr-10 ml-2 bg-muted/20 border border-border rounded-tl-lg rounded-bl-lg rounded-br-lg shadow-sm">
        <div className="flex items-center gap-2">
          <ArrowPathIcon className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t('sidepanel_thinking')}</span>
        </div>

        {/* Typing animation dots */}
        <div className="flex mt-2 space-x-1">
          <div
            className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}></div>
          <div
            className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"
            style={{ animationDelay: '200ms' }}></div>
          <div
            className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"
            style={{ animationDelay: '400ms' }}></div>
        </div>
      </div>
    </div>
  );
};
