import type { DevLocale, MessageKey } from './type';
import { defaultLocale, getMessageFromLocale } from './getMessageFromLocale';

type I18nValue = {
  message: string;
  placeholders?: Record<string, { content?: string; example?: string }>;
};

function translate(key: MessageKey, substitutions?: string | string[]) {
  console.log('locale:', t.devLocale);
  console.log('key:', key);
  console.log('substitutions:', substitutions);
  const value = getMessageFromLocale(t.devLocale)[key] as I18nValue;
  if (value === undefined || value.message === undefined) {
    console.log('value is undefined');
    return key;
  }
  let message = value.message;
  /**
   * This is a placeholder replacement logic. But it's not perfect.
   * It just imitates the behavior of the Chrome extension i18n API.
   * Please check the official document for more information And double-check the behavior on production build.
   *
   * @url https://developer.chrome.com/docs/extensions/how-to/ui/localization-message-formats#placeholders
   */
  if (value.placeholders) {
    Object.entries(value.placeholders).forEach(([key, { content }]) => {
      if (!content) {
        return;
      }
      message = message.replace(new RegExp(`\\$${key}\\$`, 'gi'), content);
    });
  }
  if (!substitutions) {
    return message;
  }
  if (Array.isArray(substitutions)) {
    return substitutions.reduce((acc, cur, idx) => acc.replace(`$${idx + 1}`, cur), message);
  }
  return message.replace(/\$(\d+)/, substitutions);
}

function removePlaceholder(message: string) {
  return message.replace(/\$\d+/g, '');
}

// Update document lang attribute when locale changes
const updateDocumentLang = (locale: DevLocale) => {
  try {
    // Update DOM attributes if in browser environment
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', locale);
    }
  } catch (error) {
    console.error('Error updating document lang:', error);
  }
};

// Define the type for the t function with its properties
type TranslateFunction = {
  (...args: Parameters<typeof translate>): string;
  devLocale: DevLocale;
};

// Create the base t function
const baseT = (...args: Parameters<typeof translate>) => {
  return removePlaceholder(translate(...args));
};

// Cast to the extended type
const t = baseT as TranslateFunction;

// Add a setter for devLocale that updates the document lang
let _devLocale = defaultLocale as DevLocale;
Object.defineProperty(t, 'devLocale', {
  get: () => _devLocale,
  set: (value: DevLocale) => {
    const oldValue = _devLocale;
    _devLocale = value;
    // Only update if the locale actually changed
    if (oldValue !== value) {
      updateDocumentLang(value);
    }
  },
});

// Export the enhanced function
export { t };

// Initialize
t.devLocale = defaultLocale as DevLocale;
