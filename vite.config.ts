/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // injectManifest : utilise notre sw.js custom, 
        // VitePWA injecte la liste des assets buildés via self.__WB_MANIFEST
        strategies: 'injectManifest',
        srcDir: 'public',
        filename: 'sw.js',
        injectManifest: {
          // Injecter un timestamp de build pour invalider le cache à chaque déploiement
          injectionPoint: undefined
        },
        manifest: {
          name: 'Suivi Magasinier — Hydromines',
          short_name: 'Hydromines',
          description: 'Gestion de stock multi-sites Hydromines',
          start_url: '/',
          display: 'standalone',
          background_color: '#0a1628',
          theme_color: '#d4af37',
          orientation: 'portrait-primary',
          lang: 'fr',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
          ],
          shortcuts: [
            { name: "Bon d'Entrée", short_name: 'Entrée', url: '/movement/entree' },
            { name: 'Bon de Sortie', short_name: 'Sortie', url: '/movement/sortie' }
          ]
        },
        devOptions: { enabled: false }
      })
    ],
    resolve: { alias: { '@': path.resolve(__dirname, '.') } },
    test: {
      globals: true,
      environment: 'jsdom',
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    // Injecter timestamp dans sw.js via define au niveau supérieur
    define: {
      'self.__BUILD_TIMESTAMP__': JSON.stringify(Date.now())
    }
  };
});
