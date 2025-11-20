import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import path from 'path';
import manifest from './src/manifest.json';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Explicit JSX configuration for browser extension context
      jsxRuntime: 'automatic',
      jsxImportSource: 'react',
    }),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@background': path.resolve(__dirname, './src/background'),
      '@popup': path.resolve(__dirname, './src/popup'),
    },
    // Force single React instance across all extension contexts
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    // Explicitly pre-bundle React JSX runtimes for browser extension
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
    ],
    // Force optimization even in build mode
    force: false,
  },
  build: {
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'src/popup/index.html'),
      },
      output: {
        // Ensure React runtime is in separate chunk for sharing across contexts
        manualChunks(id) {
          if (id.includes('react/jsx-runtime') || id.includes('react/jsx-dev-runtime')) {
            return 'jsx-runtime';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
        },
      },
    },
  },
});
