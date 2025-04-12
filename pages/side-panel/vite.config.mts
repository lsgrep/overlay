import { resolve } from 'node:path';
import { withPageConfig } from '@extension/vite-config';

const rootDir = resolve(__dirname);
const srcDir = resolve(rootDir, 'src');

export default withPageConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.e2e.test.{ts,tsx}'],
    testTimeout: 30000, // Extended timeout for API calls
    setupFiles: [resolve(__dirname, './src/services/llm/__tests__/setup.ts')],
  },
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
    outDir: resolve(rootDir, '..', '..', 'dist', 'side-panel'),
    rollupOptions: {
      external: ['chrome'],
    },
  },
});
