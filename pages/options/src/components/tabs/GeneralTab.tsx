import { useStorage } from '@extension/shared';
import { defaultLanguageStorage, defaultModelStorage, proxyModeStorage } from '@extension/storage';
import { availableLanguages as i18nAvailableLanguages } from '@extension/i18n';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@extension/ui/lib/utils';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  CommandSeparator,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Switch,
} from '@extension/ui';

interface GeneralTabProps {
  isLight: boolean;
  language: string;
  setLanguage: (lang: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  availableLanguages?: Array<{ code: string; name: string }>;
  openaiModels: Array<{ name: string; displayName?: string; provider: string }>;
  googleModels: Array<{ name: string; displayName?: string; provider: string }>;
  ollamaModels: Array<{ name: string; displayName?: string; provider: string }>;
  anthropicModels: Array<{ name: string; displayName?: string; provider: string }>;
  isLoadingModels: boolean;
  modelError: string | null;
}

export const GeneralTab = ({
  isLight,
  language,
  setLanguage,
  selectedModel,
  setSelectedModel,
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

  // Update language and model when storage changes
  useEffect(() => {
    if (defaultLanguage) setLanguage(defaultLanguage);
  }, [defaultLanguage, setLanguage]);

  useEffect(() => {
    if (defaultModel) setSelectedModel(defaultModel);
  }, [defaultModel, setSelectedModel]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">General Settings</h2>
        <p className="text-sm text-muted-foreground">Configure your default preferences for the AI assistant</p>
      </div>

      <div className="space-y-6">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label
            htmlFor="language"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Default Language
          </Label>
          <Select
            value={language}
            onValueChange={value => {
              setLanguage(value);
              defaultLanguageStorage.set(value);
            }}>
            <SelectTrigger id="language">
              <SelectValue placeholder="Select a language" />
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
          <Label htmlFor="default-model">Default Model</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between">
                {selectedModel
                  ? [...openaiModels, ...googleModels, ...anthropicModels, ...ollamaModels].find(
                      model => model.name === selectedModel,
                    )?.displayName || selectedModel
                  : 'Select a model...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
              <Command>
                <CommandInput placeholder="Search models..." />
                <CommandEmpty>No model found.</CommandEmpty>
                <CommandList>
                  {isLoadingModels ? (
                    <div className="py-6 text-center text-sm">Loading models...</div>
                  ) : modelError ? (
                    <div className="py-6 text-center text-sm text-red-500">{modelError}</div>
                  ) : (
                    <>
                      {/* OpenAI Models */}
                      {openaiModels.length > 0 && (
                        <CommandGroup heading="OpenAI Models">
                          {openaiModels.map(model => (
                            <CommandItem
                              key={model.name}
                              value={model.name}
                              onSelect={() => {
                                setSelectedModel(model.name);
                                defaultModelStorage.set(model.name);
                                setOpen(false);
                              }}>
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedModel === model.name ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              {model.displayName || model.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {/* Google Models */}
                      {googleModels.length > 0 && (
                        <CommandGroup heading="Google Models">
                          {googleModels.map(model => (
                            <CommandItem
                              key={model.name}
                              value={model.name}
                              onSelect={() => {
                                setSelectedModel(model.name);
                                defaultModelStorage.set(model.name);
                                setOpen(false);
                              }}>
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedModel === model.name ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              {model.displayName || model.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {/* Anthropic Models */}
                      {anthropicModels.length > 0 && (
                        <CommandGroup heading="Anthropic Models">
                          {anthropicModels.map(model => (
                            <CommandItem
                              key={model.name}
                              value={model.name}
                              onSelect={() => {
                                setSelectedModel(model.name);
                                defaultModelStorage.set(model.name);
                                setOpen(false);
                              }}>
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedModel === model.name ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              {model.displayName || model.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {/* Ollama Models */}
                      {ollamaModels.length > 0 && (
                        <CommandGroup heading="Ollama Models">
                          {ollamaModels.map(model => (
                            <CommandItem
                              key={model.name}
                              value={model.name}
                              onSelect={() => {
                                setSelectedModel(model.name);
                                defaultModelStorage.set(model.name);
                                setOpen(false);
                              }}>
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  selectedModel === model.name ? 'opacity-100' : 'opacity-0',
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
                Proxy Mode
              </Label>
              <p className="text-xs text-muted-foreground">Route traffic through Overlay's proxy service</p>
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
