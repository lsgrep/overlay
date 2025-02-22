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
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">Anthropic Settings</h2>
        <p className="text-sm text-muted-foreground">Configure your Anthropic API key for Claude access</p>
      </div>
      <div>
        <label
          htmlFor="anthropic-key"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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

      {/* API Key Status */}
      <div className="mt-4">
        {isLoadingModels ? (
          <p className="text-sm text-blue-500">Validating API key...</p>
        ) : modelError ? (
          <p className="text-sm text-red-500">{modelError}</p>
        ) : anthropicModels.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-green-500">✓ API key is valid ({anthropicModels.length} models available)</p>

            {/* Models List */}
            <div>
              <h4 className="text-sm font-semibold mb-2 text-blue-500">Available Models</h4>
              <div
                className={`rounded-md border ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                {anthropicModels.map(model => (
                  <div
                    key={model.name}
                    className={`p-3 border-b last:border-b-0 ${isLight ? 'border-black/5' : 'border-white/5'}`}>
                    <div className="font-medium">{model.displayName || model.name}</div>
                    <div className="text-sm opacity-60 mt-1">{model.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
};
