import * as React from 'react';
import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@extension/ui/lib/utils';
import { OpenAIIcon, GeminiIcon, OllamaIcon, AnthropicIcon } from '@extension/ui/lib/icons';
import {
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
  Label,
} from '@extension/ui';

export interface ModelSelectorProps {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  openaiModels: Array<{ name: string; displayName?: string; provider: string }>;
  geminiModels: Array<{ name: string; displayName?: string; provider: string }>;
  ollamaModels: Array<{ name: string; displayName?: string; provider: string }>;
  anthropicModels: Array<{ name: string; displayName?: string; provider: string }>;
  isLoadingModels?: boolean;
  modelError?: string | null;
}

export const ModelSelector = ({
  selectedModel,
  setSelectedModel,
  openaiModels = [],
  geminiModels = [],
  ollamaModels = [],
  anthropicModels = [],
  isLoadingModels = false,
  modelError = null,
}: ModelSelectorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-4">
      <Label htmlFor="model-selector" className="min-w-16">
        Model
      </Label>
      <Popover open={open} onOpenChange={setOpen} className="flex-1">
        <PopoverTrigger asChild>
          <Button id="model-selector" variant="outline" role="combobox" className="w-full justify-between">
            {selectedModel
              ? [...openaiModels, ...geminiModels, ...anthropicModels, ...ollamaModels].find(
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
                            setOpen(false);
                          }}>
                          <div className="flex items-center gap-2">
                            <Check
                              className={cn('h-4 w-4', selectedModel === model.name ? 'opacity-100' : 'opacity-0')}
                            />
                            <OpenAIIcon className="h-4 w-4" />
                            {model.displayName || model.name}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {/* Gemini Models */}
                  {geminiModels.length > 0 && (
                    <CommandGroup heading="Gemini Models">
                      {geminiModels.map(model => (
                        <CommandItem
                          key={model.name}
                          value={model.name}
                          onSelect={() => {
                            setSelectedModel(model.name);
                            setOpen(false);
                          }}>
                          <div className="flex items-center gap-2">
                            <Check
                              className={cn('h-4 w-4', selectedModel === model.name ? 'opacity-100' : 'opacity-0')}
                            />
                            <GeminiIcon className="h-4 w-4" />
                            {model.displayName || model.name}
                          </div>
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
                            setOpen(false);
                          }}>
                          <div className="flex items-center gap-2">
                            <Check
                              className={cn('h-4 w-4', selectedModel === model.name ? 'opacity-100' : 'opacity-0')}
                            />
                            <AnthropicIcon className="h-4 w-4" />
                            {model.displayName || model.name}
                          </div>
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
                            setOpen(false);
                          }}>
                          <div className="flex items-center gap-2">
                            <Check
                              className={cn('h-4 w-4', selectedModel === model.name ? 'opacity-100' : 'opacity-0')}
                            />
                            <OllamaIcon className="h-4 w-4" />
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
  );
};
