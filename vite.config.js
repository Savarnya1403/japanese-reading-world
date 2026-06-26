import { defineConfig } from 'vite';

export default defineConfig({
  // Allow Vite to serve the project from the root
  root: '.',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',
    },
  },
});
