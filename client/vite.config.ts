import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command, mode }) => ({
  // Explicit local tests cannot inherit a remote API URL. Production builds are unchanged.
  define: command === 'serve' && mode === 'local-test'
    ? { 'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:3001/api') }
    : undefined,
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      manifest: {
        name: 'Sistema de Vales',
        short_name: 'Vales',
        description: 'Sistema de gestión de órdenes de trabajo',
        theme_color: '#0e2b9d',
        background_color: '#0e2b9d',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/app-logo-v2-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/app-logo-v2-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
  }
}));
