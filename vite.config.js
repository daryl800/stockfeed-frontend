import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/stockfeed-frontend/', // <- your repo name
  plugins: [react()],
});
