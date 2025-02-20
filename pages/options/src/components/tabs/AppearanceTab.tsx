import { useStorage } from '@extension/shared';
import { fontFamilyStorage, fontSizeStorage } from '@extension/storage';
import { motion } from 'framer-motion';

interface AppearanceTabProps {
  isLight: boolean;
}

export const AppearanceTab = ({ isLight }: AppearanceTabProps) => {
  const fontFamily = useStorage(fontFamilyStorage);
  const fontSize = useStorage(fontSizeStorage);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Appearance Settings</h3>
        <p className="text-sm opacity-60">Customize the visual appearance of the application</p>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="font-family" className="block text-sm font-semibold mb-2 text-blue-500">
            Font Family
          </label>
          <select
            id="font-family"
            value={fontFamily}
            onChange={e => fontFamilyStorage.set(e.target.value)}
            className={`w-full p-3 rounded-md border transition-colors focus:border-blue-500 focus:outline-none ${
              isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'
            }`}>
            <optgroup label="Programming Fonts">
              <option value="JetBrains Mono">JetBrains Mono</option>
              <option value="Fira Code">Fira Code</option>
              <option value="Source Code Pro">Source Code Pro</option>
              <option value="Cascadia Code">Cascadia Code</option>
              <option value="Hack">Hack</option>
              <option value="Monaco">Monaco</option>
              <option value="Menlo">Menlo</option>
              <option value="SF Mono">SF Mono</option>
            </optgroup>
            <optgroup label="System Fonts">
              <option value="system-ui">System Default</option>
              <option value="monospace">Monospace</option>
              <option value="Courier New">Courier New</option>
            </optgroup>
          </select>
        </div>

        <div>
          <label htmlFor="font-size" className="block text-sm font-semibold mb-2 text-blue-500">
            Font Size
          </label>
          <div className="flex items-center gap-4">
            <input
              id="font-size"
              type="range"
              min="12"
              max="24"
              value={fontSize}
              onChange={e => fontSizeStorage.set(parseInt(e.target.value, 10))}
              className="flex-1"
            />
            <span className="text-sm">{fontSize}px</span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2 text-blue-500">Preview</h4>
          <div
            className={`p-4 rounded-md border ${isLight ? 'bg-white border-black/10' : 'bg-black border-white/10'}`}
            style={{ fontFamily, fontSize: `${fontSize}px` }}>
            The quick brown fox jumps over the lazy dog.
          </div>
        </div>
      </div>
    </motion.div>
  );
};
