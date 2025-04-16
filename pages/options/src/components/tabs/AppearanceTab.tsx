import { useStorage } from '@extension/shared';
import { fontFamilyStorage, fontSizeStorage, defaultLanguageStorage } from '@extension/storage';
import type { DevLocale } from '@extension/i18n';
import { t } from '@extension/i18n';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Label,
} from '@extension/ui';

interface AppearanceTabProps {
  isLight: boolean;
}

export const AppearanceTab = ({ isLight }: AppearanceTabProps) => {
  const fontFamily = useStorage(fontFamilyStorage);
  const fontSize = useStorage(fontSizeStorage);
  const language = useStorage(defaultLanguageStorage);

  // Update translations when language changes
  useEffect(() => {
    if (language) {
      // Set the locale directly from storage
      t.devLocale = language as DevLocale;
      console.log('AppearanceTab: Language set to', language);
    }
  }, [language]);

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">{t('options_appearance_settings')}</h2>
        <p className="text-muted-foreground">{t('options_appearance_description')}</p>
      </div>

      <div className="space-y-6 w-full min-w-[300px]">
        <div className="space-y-2">
          <Label
            htmlFor="font-family"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t('options_font_family')}
          </Label>
          <Select value={fontFamily} onValueChange={value => fontFamilyStorage.set(value)}>
            <SelectTrigger
              id="font-family"
              className={`w-full ${isLight ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-700 text-white'}`}>
              <SelectValue placeholder={t('options_select_font_family')} />
            </SelectTrigger>
            <SelectContent className={isLight ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-700 text-white'}>
              <SelectGroup className={!isLight ? 'text-gray-300' : ''}>
                <SelectLabel className={!isLight ? 'text-gray-300' : ''}>{t('options_programming_fonts')}</SelectLabel>
                <SelectItem
                  value="JetBrains Mono"
                  className={!isLight ? 'text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white' : ''}>
                  JetBrains Mono
                </SelectItem>
                <SelectItem
                  value="Fira Code"
                  className={!isLight ? 'text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white' : ''}>
                  Fira Code
                </SelectItem>
                <SelectItem
                  value="Source Code Pro"
                  className={!isLight ? 'text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white' : ''}>
                  Source Code Pro
                </SelectItem>
                <SelectItem
                  value="Cascadia Code"
                  className={!isLight ? 'text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white' : ''}>
                  Cascadia Code
                </SelectItem>
                <SelectItem
                  value="Hack"
                  className={!isLight ? 'text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white' : ''}>
                  Hack
                </SelectItem>
                <SelectItem
                  value="Monaco"
                  className={!isLight ? 'text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white' : ''}>
                  Monaco
                </SelectItem>
                <SelectItem
                  value="Menlo"
                  className={!isLight ? 'text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white' : ''}>
                  Menlo
                </SelectItem>
                <SelectItem
                  value="SF Mono"
                  className={!isLight ? 'text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white' : ''}>
                  SF Mono
                </SelectItem>
              </SelectGroup>
              <SelectGroup className={!isLight ? 'text-gray-300' : ''}>
                <SelectLabel className={!isLight ? 'text-gray-300' : ''}>{t('options_system_fonts')}</SelectLabel>
                <SelectItem
                  value="system-ui"
                  className={!isLight ? 'text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white' : ''}>
                  {t('options_system_default')}
                </SelectItem>
                <SelectItem
                  value="monospace"
                  className={!isLight ? 'text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white' : ''}>
                  Monospace
                </SelectItem>
                <SelectItem
                  value="Courier New"
                  className={!isLight ? 'text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white' : ''}>
                  Courier New
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="font-size"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t('options_font_size')}
          </Label>
          <Select value={`${fontSize}`} onValueChange={value => fontSizeStorage.set(parseInt(value, 10))}>
            <SelectTrigger
              id="font-size"
              className={`w-full ${isLight ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-700 text-white'}`}>
              <SelectValue placeholder={t('options_select_font_size')} />
            </SelectTrigger>
            <SelectContent className={isLight ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-700 text-white'}>
              <SelectItem
                value="12"
                className={!isLight ? 'text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white' : ''}>
                12px
              </SelectItem>
              <SelectItem
                value="13"
                className={!isLight ? 'text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white' : ''}>
                13px
              </SelectItem>
              <SelectItem
                value="14"
                className={!isLight ? 'text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white' : ''}>
                14px
              </SelectItem>
              <SelectItem
                value="15"
                className={!isLight ? 'text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white' : ''}>
                15px
              </SelectItem>
              <SelectItem
                value="16"
                className={!isLight ? 'text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white' : ''}>
                16px
              </SelectItem>
              <SelectItem
                value="18"
                className={!isLight ? 'text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white' : ''}>
                18px
              </SelectItem>
              <SelectItem
                value="20"
                className={!isLight ? 'text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white' : ''}>
                20px
              </SelectItem>
              <SelectItem
                value="24"
                className={!isLight ? 'text-white data-[highlighted]:bg-gray-800 data-[highlighted]:text-white' : ''}>
                24px
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">{t('options_preview')}</h4>
          <div
            className={`p-4 rounded-md border ${isLight ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-700 text-white'}`}
            style={{ fontFamily, fontSize: `${fontSize}px` }}>
            {t('options_preview_text')}
          </div>
        </div>
      </div>
    </div>
  );
};
