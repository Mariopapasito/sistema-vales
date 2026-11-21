import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'reader-test'),
  publicDir: false,
  // The portable screen has its own CSS; do not load the application's Tailwind pipeline.
  css: { postcss: { plugins: [] } },
  esbuild: { jsx: 'automatic' },
  build: {
    outDir: path.resolve(__dirname, '../.local-data/secugen-windows/web'),
    emptyOutDir: true,
    sourcemap: false,
  },
});
