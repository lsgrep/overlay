import { useStorage } from '@extension/shared';
import { openAIKeyStorage } from '@extension/storage';
import { motion } from 'framer-motion';

interface OpenAITabProps {
  isLight: boolean;
  showOpenAIKey: boolean;
  setShowOpenAIKey: (show: boolean) => void;
}

export const OpenAITab = ({ isLight, showOpenAIKey, setShowOpenAIKey }: OpenAITabProps) => {
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
    </motion.div>
  );
};
