import { defineConfig } from 'vite';

// base './' membuat hasil build jalan di GitHub Pages tanpa peduli nama repo
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 900 }
});
