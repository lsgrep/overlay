import { useStorage } from '@extension/shared';
import { defaultLanguageStorage, defaultModelStorage, proxyModeStorage } from '@extension/storage';
import type { DevLocale } from '@extension/i18n';
import { availableLanguages as i18nAvailableLanguages, t } from '@extension/i18n';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@extension/ui/lib/utils';
import { OpenAIIcon, GeminiIcon, AnthropicIcon, OllamaIcon } from '@extension/ui';
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
  isLight?: boolean;
}

export const GeneralTab = ({
  availableLanguages = i18nAvailableLanguages,
  openaiModels = [],
  googleModels = [],
  ollamaModels = [],
  anthropicModels = [],
  isLoadingModels = false,
  modelError = null,
  isLight = true,
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
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">{t('options_general_settings')}</h2>
        <p className="text-muted-foreground">{t('options_general_description')}</p>
      </div>

      <div className="space-y-6 w-full min-w-[300px]">
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="default-model">{t('options_default_model')}</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between bg-background border-border text-foreground">
                {defaultModel ? (
                  <div className="flex items-center">
                    {(() => {
                      const model = [...openaiModels, ...googleModels, ...anthropicModels, ...ollamaModels].find(
                        m => m.name === defaultModel,
                      );

                      // Display appropriate icon based on provider
                      if (model) {
                        if (openaiModels.some(m => m.name === model.name)) {
                          return <OpenAIIcon className="h-4 w-4 mr-2 text-foreground opacity-70" />;
                        } else if (googleModels.some(m => m.name === model.name)) {
                          return <GeminiIcon className="h-4 w-4 mr-2 text-foreground opacity-70" />;
                        } else if (anthropicModels.some(m => m.name === model.name)) {
                          return <AnthropicIcon className="h-4 w-4 mr-2 text-foreground opacity-70" />;
                        } else if (ollamaModels.some(m => m.name === model.name)) {
                          return <OllamaIcon className="h-4 w-4 mr-2 text-foreground opacity-70" />;
                        }
                      }
                      return null;
                    })()}
                    {[...openaiModels, ...googleModels, ...anthropicModels, ...ollamaModels].find(
                      model => model.name === defaultModel,
                    )?.displayName || defaultModel}
                  </div>
                ) : (
                  t('options_select_model')
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 max-w-[400px] bg-popover border-border text-popover-foreground">
              <Command className="bg-popover">
                <CommandInput placeholder={t('options_search_models')} className="border-input text-foreground" />
                <CommandEmpty>{t('options_no_model_found')}</CommandEmpty>
                <CommandList className="max-h-[300px]">
                  {isLoadingModels ? (
                    <div className="py-6 text-center text-sm">{t('options_loading_models')}</div>
                  ) : modelError ? (
                    <div className="py-6 text-center text-sm text-red-500">{modelError}</div>
                  ) : (
                    <>
                      {/* OpenAI Models */}
                      {openaiModels.length > 0 && (
                        <CommandGroup heading={t('options_openai_models')} className="text-foreground/70">
                          {openaiModels.map(model => (
                            <CommandItem
                              key={model.name}
                              value={model.name}
                              className="text-foreground hover:bg-accent"
                              onSelect={() => {
                                defaultModelStorage.set(model.name);
                                setOpen(false);
                              }}>
                              <div className="flex items-center">
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    defaultModel === model.name ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                <OpenAIIcon className="h-4 w-4 mr-2 text-foreground opacity-70" />
                                {model.displayName || model.name}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {/* Google Models */}
                      {googleModels.length > 0 && (
                        <CommandGroup heading={t('options_google_models')} className="text-foreground/70">
                          {googleModels.map(model => (
                            <CommandItem
                              key={model.name}
                              value={model.name}
                              className="text-foreground hover:bg-accent"
                              onSelect={() => {
                                defaultModelStorage.set(model.name);
                                setOpen(false);
                              }}>
                              <div className="flex items-center">
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    defaultModel === model.name ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                <GeminiIcon className="h-4 w-4 mr-2 text-foreground opacity-70" />
                                {model.displayName || model.name}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {/* Anthropic Models */}
                      {anthropicModels.length > 0 && (
                        <CommandGroup heading={t('options_anthropic_models')} className="text-foreground/70">
                          {anthropicModels.map(model => (
                            <CommandItem
                              key={model.name}
                              value={model.name}
                              className="text-foreground hover:bg-accent"
                              onSelect={() => {
                                defaultModelStorage.set(model.name);
                                setOpen(false);
                              }}>
                              <div className="flex items-center">
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    defaultModel === model.name ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                <AnthropicIcon className="h-4 w-4 mr-2 text-foreground opacity-70" />
                                {model.displayName || model.name}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {/* Ollama Models */}
                      {ollamaModels.length > 0 && (
                        <CommandGroup heading={t('options_ollama_models')} className="text-foreground/70">
                          {ollamaModels.map(model => (
                            <CommandItem
                              key={model.name}
                              value={model.name}
                              className="text-foreground hover:bg-accent"
                              onSelect={() => {
                                defaultModelStorage.set(model.name);
                                setOpen(false);
                              }}>
                              <div className="flex items-center">
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    defaultModel === model.name ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                <OllamaIcon className="h-4 w-4 mr-2 text-foreground opacity-70" />
                                {model.displayName || model.name}
                              </div>
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

        <div className="grid w-full items-center gap-1.5 pt-4">
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
              className="bg-muted data-[state=checked]:bg-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
