import { useStorage } from '@extension/shared';
import { anthropicKeyStorage } from '@extension/storage';
import { motion } from 'framer-motion';
import { Model } from '@extension/shared';

interface AnthropicTabProps {
  isLight: boolean;
  showAnthropicKey: boolean;
  setShowAnthropicKey: (show: boolean) => void;
  isLoadingModels: boolean;
  modelError: string | null;
  anthropicModels: Model[];
}

export const AnthropicTab = ({
  isLight,
  showAnthropicKey,
  setShowAnthropicKey,
  isLoadingModels,
  modelError,
  anthropicModels,
}: AnthropicTabProps) => {
  const anthropicKey = useStorage(anthropicKeyStorage);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Anthropic Settings</h3>
        <p className="text-sm opacity-60">Configure your Anthropic API key for Claude access</p>
      </div>
      <div>
        <label htmlFor="anthropic-key" className="block text-sm font-semibold mb-2 text-blue-500">
          API Key
        </label>
        <div className="relative">
          <input
            id="anthropic-key"
            type={showAnthropicKey ? 'text' : 'password'}
            value={anthropicKey}
            onChange={e => anthropicKeyStorage.set(e.target.value)}
            className={`w-full p-3 pr-10 rounded-md border transition-colors focus:border-blue-500 focus:outline-none ${
              isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'
            }`}
            placeholder="sk-ant-..."
          />
          <button
            type="button"
            onClick={() => setShowAnthropicKey(!showAnthropicKey)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {showAnthropicKey ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="available-models" className="block text-sm font-semibold mb-2 text-blue-500">
          Available Models
        </label>
        <div id="available-models" className={`rounded-md border ${isLight ? 'border-black/10' : 'border-white/10'}`}>
          {isLoadingModels ? (
            <div className="p-4 text-center text-sm opacity-60">Loading models...</div>
          ) : modelError ? (
            <div className="p-4 text-center text-sm text-red-500">{modelError}</div>
          ) : anthropicModels.length === 0 ? (
            <div className="p-4 text-center text-sm opacity-60">
              {anthropicKey ? 'No models found' : 'Enter API key to view available models'}
            </div>
          ) : (
            <div className="divide-y divide-black/10 dark:divide-white/10">
              {anthropicModels.map(model => (
                <div key={model.name} className="p-3 text-sm">
                  <div className="font-medium">{model.displayName}</div>
                  <div className="text-xs opacity-60 mt-1">{model.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
