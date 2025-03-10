import type React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { t } from '@extension/i18n';

interface ErrorMessageProps {
  error: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error }) => {
  return (
    <div className="relative flex items-start gap-2">
      {/* Error icon */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center
        bg-destructive/10">
        <ExclamationTriangleIcon className="w-4 h-4 text-destructive" />
      </div>

      {/* Error message content */}
      <div className="flex-1 p-3 mr-10 ml-2 bg-destructive/10 border border-destructive/20 rounded-lg shadow-sm">
        <div className="text-xs font-semibold mb-1 text-destructive">{t('sidepanel_error')}</div>
        <div className="text-sm text-destructive/90">{error}</div>
      </div>
    </div>
  );
};
