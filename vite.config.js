import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  css: {
    preprocessorOptions: {
      scss: {},
    },
  },
});
