import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const yahooProxy = {
  target: 'https://query1.finance.yahoo.com',
  changeOrigin: true,
  secure: true,
  rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
};

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/yahoo': yahooProxy,
    },
  },
  preview: {
    proxy: {
      '/api/yahoo': yahooProxy,
    },
  },
});
