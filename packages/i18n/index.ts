import { t as t_dev_or_prod } from './lib/i18n';
import { t as t_dev } from './lib/i18n-dev';
import {
  languageCodeToName,
  languageCodeToNativeName,
  availableLanguages,
  getLanguageNameFromCode,
} from './lib/languageMap';

export const t = t_dev;
export { languageCodeToName, languageCodeToNativeName, availableLanguages, getLanguageNameFromCode };
