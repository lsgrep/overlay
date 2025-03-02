import { useStorage } from '@extension/shared';
import { fontFamilyStorage, fontSizeStorage, defaultLanguageStorage } from '@extension/storage';
import { DevLocale, t } from '@extension/i18n';
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">{t('options_appearance_settings')}</h2>
        <p className="text-sm text-muted-foreground">{t('options_appearance_description')}</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label
            htmlFor="font-family"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t('options_font_family')}
          </Label>
          <Select value={fontFamily} onValueChange={value => fontFamilyStorage.set(value)}>
            <SelectTrigger
              id="font-family"
              className={`w-full ${isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'}`}>
              <SelectValue placeholder={t('options_select_font_family')} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{t('options_programming_fonts')}</SelectLabel>
                <SelectItem value="JetBrains Mono">JetBrains Mono</SelectItem>
                <SelectItem value="Fira Code">Fira Code</SelectItem>
                <SelectItem value="Source Code Pro">Source Code Pro</SelectItem>
                <SelectItem value="Cascadia Code">Cascadia Code</SelectItem>
                <SelectItem value="Hack">Hack</SelectItem>
                <SelectItem value="Monaco">Monaco</SelectItem>
                <SelectItem value="Menlo">Menlo</SelectItem>
                <SelectItem value="SF Mono">SF Mono</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>{t('options_system_fonts')}</SelectLabel>
                <SelectItem value="system-ui">{t('options_system_default')}</SelectItem>
                <SelectItem value="monospace">Monospace</SelectItem>
                <SelectItem value="Courier New">Courier New</SelectItem>
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
              className={`w-full ${isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'}`}>
              <SelectValue placeholder={t('options_select_font_size')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12px</SelectItem>
              <SelectItem value="13">13px</SelectItem>
              <SelectItem value="14">14px</SelectItem>
              <SelectItem value="15">15px</SelectItem>
              <SelectItem value="16">16px</SelectItem>
              <SelectItem value="18">18px</SelectItem>
              <SelectItem value="20">20px</SelectItem>
              <SelectItem value="24">24px</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">{t('options_preview')}</h4>
          <div
            className={`p-4 rounded-md border ${isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'}`}
            style={{ fontFamily, fontSize: `${fontSize}px` }}>
            {t('options_preview_text')}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
