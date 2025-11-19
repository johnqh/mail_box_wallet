import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import path from 'path';
import manifest from './src/manifest.json';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@background': path.resolve(__dirname, './src/background'),
      '@popup': path.resolve(__dirname, './src/popup'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'src/popup/index.html'),
      },
    },
  },
});
