import { useStorage } from '@extension/shared';
import { geminiKeyStorage } from '@extension/storage';
import { motion } from 'framer-motion';
import { Model } from '@extension/shared';

interface GoogleTabProps {
  isLight: boolean;
  showGeminiKey: boolean;
  setShowGeminiKey: (show: boolean) => void;
  isLoadingModels: boolean;
  modelError: string | null;
  googleModels: Model[];
}

export const GoogleTab = ({
  isLight,
  showGeminiKey,
  setShowGeminiKey,
  isLoadingModels,
  modelError,
  googleModels,
}: GoogleTabProps) => {
  const geminiKey = useStorage(geminiKeyStorage);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Google Settings</h3>
        <p className="text-sm opacity-60">Configure your Google API key and Gemini model preferences</p>
      </div>
      <div className="space-y-6">
        <div>
          <label htmlFor="gemini-key" className="block text-sm font-semibold mb-2 text-blue-500">
            API Key
          </label>
          <div className="relative">
            <input
              id="gemini-key"
              type={showGeminiKey ? 'text' : 'password'}
              value={geminiKey}
              onChange={e => geminiKeyStorage.set(e.target.value)}
              className={`w-full p-3 pr-10 rounded-md border transition-colors focus:border-blue-500 focus:outline-none ${
                isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'
              }`}
              placeholder="AI..."
            />
            <button
              type="button"
              onClick={() => setShowGeminiKey(!showGeminiKey)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {showGeminiKey ? '👁️' : '👁️‍🗨️'}
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
            ) : googleModels.length === 0 ? (
              <div className="p-4 text-center text-sm opacity-60">
                {geminiKey ? 'No models found' : 'Enter API key to view available models'}
              </div>
            ) : (
              <div className="divide-y divide-black/10 dark:divide-white/10">
                {googleModels.map(model => (
                  <div key={model.name} className="p-3 text-sm">
                    <div className="font-medium">{model.displayName || model.name.split('/').pop()}</div>
                    <div className="text-xs opacity-60 mt-1">{model.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
