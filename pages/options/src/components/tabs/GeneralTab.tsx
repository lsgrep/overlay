import { useStorage } from '@extension/shared';
import { defaultLanguageStorage, defaultModelStorage, proxyModeStorage } from '@extension/storage';
import type { DevLocale } from '@extension/i18n';
import { availableLanguages as i18nAvailableLanguages, t } from '@extension/i18n';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@extension/ui/lib/utils';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Switch,
} from '@extension/ui';

interface GeneralTabProps {
  availableLanguages?: Array<{ code: string; name: string }>;
  openaiModels: Array<{ name: string; displayName?: string; provider: string }>;
  googleModels: Array<{ name: string; displayName?: string; provider: string }>;
  ollamaModels: Array<{ name: string; displayName?: string; provider: string }>;
  anthropicModels: Array<{ name: string; displayName?: string; provider: string }>;
  isLoadingModels: boolean;
  modelError: string | null;
}

export const GeneralTab = ({
  availableLanguages = i18nAvailableLanguages,
  openaiModels = [],
  googleModels = [],
  ollamaModels = [],
  anthropicModels = [],
  isLoadingModels = false,
  modelError = null,
}: GeneralTabProps) => {
  // Use storage hooks for language and model
  const defaultLanguage = useStorage(defaultLanguageStorage);
  const defaultModel = useStorage(defaultModelStorage);
  const proxyMode = useStorage(proxyModeStorage);
  const [open, setOpen] = useState(false);
  // Update translations when language changes
  useEffect(() => {
    if (defaultLanguage) {
      // Set the locale directly from storage
      t.devLocale = defaultLanguage as DevLocale;
      console.log('GeneralTab: Language set to', defaultLanguage);
    }
  }, [defaultLanguage]);

  // Update language and model when storage changes
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">{t('options_general_settings')}</h2>
        <p className="text-sm text-muted-foreground">{t('options_general_description')}</p>
      </div>

      <div className="space-y-6">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label
            htmlFor="language"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {t('options_default_language')}
          </Label>
          <Select
            value={defaultLanguage}
            onValueChange={value => {
              defaultLanguageStorage.set(value);
              // Update the translation locale immediately
              t.devLocale = value as any;
            }}>
            <SelectTrigger id="language">
              <SelectValue placeholder={t('options_select_language')} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {availableLanguages.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="default-model">{t('options_default_model')}</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between">
                {defaultModel
                  ? [...openaiModels, ...googleModels, ...anthropicModels, ...ollamaModels].find(
                      model => model.name === defaultModel,
                    )?.displayName || defaultModel
                  : t('options_select_model')}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
              <Command>
                <CommandInput placeholder={t('options_search_models')} />
                <CommandEmpty>{t('options_no_model_found')}</CommandEmpty>
                <CommandList>
                  {isLoadingModels ? (
                    <div className="py-6 text-center text-sm">{t('options_loading_models')}</div>
                  ) : modelError ? (
                    <div className="py-6 text-center text-sm text-red-500">{modelError}</div>
                  ) : (
                    <>
                      {/* OpenAI Models */}
                      {openaiModels.length > 0 && (
                        <CommandGroup heading={t('options_openai_models')}>
                          {openaiModels.map(model => (
                            <CommandItem
                              key={model.name}
                              value={model.name}
                              onSelect={() => {
                                defaultModelStorage.set(model.name);
                                setOpen(false);
                              }}>
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  defaultModel === model.name ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              {model.displayName || model.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {/* Google Models */}
                      {googleModels.length > 0 && (
                        <CommandGroup heading={t('options_google_models')}>
                          {googleModels.map(model => (
                            <CommandItem
                              key={model.name}
                              value={model.name}
                              onSelect={() => {
                                defaultModelStorage.set(model.name);
                                setOpen(false);
                              }}>
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  defaultModel === model.name ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              {model.displayName || model.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {/* Anthropic Models */}
                      {anthropicModels.length > 0 && (
                        <CommandGroup heading={t('options_anthropic_models')}>
                          {anthropicModels.map(model => (
                            <CommandItem
                              key={model.name}
                              value={model.name}
                              onSelect={() => {
                                defaultModelStorage.set(model.name);
                                setOpen(false);
                              }}>
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  defaultModel === model.name ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              {model.displayName || model.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {/* Ollama Models */}
                      {ollamaModels.length > 0 && (
                        <CommandGroup heading={t('options_ollama_models')}>
                          {ollamaModels.map(model => (
                            <CommandItem
                              key={model.name}
                              value={model.name}
                              onSelect={() => {
                                defaultModelStorage.set(model.name);
                                setOpen(false);
                              }}>
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  defaultModel === model.name ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              {model.displayName || model.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid w-full max-w-sm items-center gap-1.5 pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="proxy-mode" className="text-sm font-medium leading-none">
                {t('options_proxy_mode')}
              </Label>
              <p className="text-xs text-muted-foreground">{t('options_proxy_mode_description')}</p>
            </div>
            <Switch
              id="proxy-mode"
              checked={proxyMode}
              onCheckedChange={checked => {
                proxyModeStorage.set(checked);
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
