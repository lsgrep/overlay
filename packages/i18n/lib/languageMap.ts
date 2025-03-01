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
 * Get the display name for a language code
 * @param code The language code
 * @returns The display name or 'English' as fallback
 */
export function getLanguageNameFromCode(code: string): string {
  return languageCodeToName[code] || 'English';
}
