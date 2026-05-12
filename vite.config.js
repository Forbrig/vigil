import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves this project from /vigil/, not the domain root.
  base: '/vigil/',
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
