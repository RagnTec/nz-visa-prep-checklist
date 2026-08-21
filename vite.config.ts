import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import {
  assertProductionBundleSafety,
  stripExternalSurveyFonts
} from './build/stripExternalFonts';
import { resolveBasePath } from './build/basePath';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.');

  return {
    root: '.',
    plugins: [stripExternalSurveyFonts(), react(), assertProductionBundleSafety()],
    base: resolveBasePath(env.VITE_BASE_PATH),
    test: {
      environment: 'jsdom',
      setupFiles: './tests/setup.ts'
    }
  };
});
