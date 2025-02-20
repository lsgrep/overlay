import { useStorage } from '@extension/shared';
import { openAIKeyStorage } from '@extension/storage';
import { motion } from 'framer-motion';

interface OpenAITabProps {
  isLight: boolean;
  showOpenAIKey: boolean;
  setShowOpenAIKey: (show: boolean) => void;
  isLoadingModels?: boolean;
  modelError?: string | null;
  openaiModels?: Array<{ name: string; displayName?: string; provider: string }>;
}

export const OpenAITab = ({
  isLight,
  showOpenAIKey,
  setShowOpenAIKey,
  isLoadingModels = false,
  modelError = null,
  openaiModels = [],
}: OpenAITabProps) => {
  const openAIKey = useStorage(openAIKeyStorage);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">OpenAI Settings</h3>
        <p className="text-sm opacity-60">Configure your OpenAI API key and model preferences</p>
      </div>
      <div>
        <label htmlFor="openai-key" className="block text-sm font-semibold mb-2 text-blue-500">
          API Key
        </label>
        <div className="relative">
          <input
            id="openai-key"
            type={showOpenAIKey ? 'text' : 'password'}
            value={openAIKey}
            onChange={e => openAIKeyStorage.set(e.target.value)}
            className={`w-full p-3 pr-10 rounded-md border transition-colors focus:border-blue-500 focus:outline-none ${
              isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'
            }`}
            placeholder="sk-..."
          />
          <button
            type="button"
            onClick={() => setShowOpenAIKey(!showOpenAIKey)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {showOpenAIKey ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>
      </div>

      {/* API Key Status */}
      <div className="mt-4">
        {isLoadingModels ? (
          <p className="text-sm text-blue-500">Validating API key...</p>
        ) : modelError ? (
          <p className="text-sm text-red-500">{modelError}</p>
        ) : openaiModels.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-green-500">✓ API key is valid ({openaiModels.length} models available)</p>

            {/* Models List */}
            <div>
              <h4 className="text-sm font-semibold mb-2 text-blue-500">Available Models</h4>
              <div
                className={`bg-opacity-5 rounded-md border ${isLight ? 'bg-black border-black/10' : 'bg-white border-white/10'}`}>
                {openaiModels.map(model => (
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
