import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const appVersion =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ||
  process.env.VERCEL_DEPLOYMENT_ID ||
  String(Date.now());

const injectServiceWorkerVersion = () => ({
  name: 'inject-service-worker-version',
  closeBundle() {
    const swPath = resolve(__dirname, 'dist/sw.js');
    if (!existsSync(swPath)) return;
    const content = readFileSync(swPath, 'utf8').replace(/__APP_VERSION__/g, appVersion);
    writeFileSync(swPath, content);
  },
});

export default defineConfig({
  plugins: [react(), injectServiceWorkerVersion()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  server: {
    port: 5173,
  },
});
