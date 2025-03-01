import { t as t_dev_or_prod } from './lib/i18n';
import type { t as t_dev } from './lib/i18n-dev';
import { languageCodeToName, getLanguageNameFromCode } from './lib/languageMap';

export const t = t_dev_or_prod as unknown as typeof t_dev;
export { languageCodeToName, getLanguageNameFromCode };
