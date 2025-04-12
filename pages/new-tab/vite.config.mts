import { resolve } from 'node:path';
import { withPageConfig } from '@extension/vite-config';

const rootDir = resolve(__dirname);
const srcDir = resolve(rootDir, 'src');

export default withPageConfig({
  resolve: {
    alias: {
      '@src': srcDir,
      '@extension/i18n': resolve(rootDir, '..', '..', 'packages', 'i18n'),
      '@extension/shared': resolve(rootDir, '..', '..', 'packages', 'shared'),
      '@extension/storage': resolve(rootDir, '..', '..', 'packages', 'storage'),
      '@extension/ui': resolve(rootDir, '..', '..', 'packages', 'ui'),
    },
  },
  publicDir: resolve(rootDir, 'public'),
  build: {
    outDir: resolve(rootDir, '..', '..', 'dist', 'new-tab'),
  },
});
