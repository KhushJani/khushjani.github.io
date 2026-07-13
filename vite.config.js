import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5178,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 5178,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
  },
});
