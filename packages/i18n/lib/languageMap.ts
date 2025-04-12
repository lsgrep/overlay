/**
 * Mapping of language codes to their display names
 * This is used across the extension to provide consistent language naming
 */
export const languageCodeToName: { [key: string]: string } = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ru: 'Russian',
  zh_CN: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
};

/**
 * Mapping of language codes to their native display names
 */
export const languageCodeToNativeName: { [key: string]: string } = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ru: 'Русский',
  zh_CN: '中文',
  ja: '日本語',
  ko: '한국어',
};

/**
 * List of available languages with code and name for use in UI components
 */
export const availableLanguages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh_CN', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
];

/**
 * Get the display name for a language code
 * @param code The language code
 * @returns The display name or 'English' as fallback
 */
export function getLanguageNameFromCode(code: string): string {
  return languageCodeToName[code] || 'English';
}
