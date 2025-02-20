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
      </div>

      {/* API Key Status */}
      <div className="mt-4">
        {isLoadingModels ? (
          <p className="text-sm text-blue-500">Validating API key...</p>
        ) : modelError ? (
          <p className="text-sm text-red-500">{modelError}</p>
        ) : googleModels.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-green-500">✓ API key is valid ({googleModels.length} models available)</p>

            {/* Models List */}
            <div>
              <h4 className="text-sm font-semibold mb-2 text-blue-500">Available Models</h4>
              <div
                className={`rounded-md border ${isLight ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10'}`}>
                {googleModels.map(model => (
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
