import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `npm run dev:mobile` usa HTTPS local: navegadores só liberam o giroscópio em contexto seguro.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'https' ? [basicSsl()] : [],
  build: {
    chunkSizeWarningLimit: 1600,
  },
}));
