/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { contentPlugin } from './src/content/plugin.ts'

// BASE_PATH lets you deploy under a sub-path, e.g. GitHub Pages: BASE_PATH=/french/
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  // Always the same address: sign-in and progress are stored per address, so a dev
  // server that silently moved to :5174 would look signed out with no progress.
  server: { port: 5173, strictPort: true },
  plugins: [
    // Lessons, vocabulary, texts, role-plays, writing prompts and pronunciation sets live in content/*.md.
    contentPlugin(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Petit à petit — French study',
        short_name: 'Petit à petit',
        description: 'Learn French grammar, vocabulary and conjugation with spaced repetition.',
        lang: 'en',
        theme_color: '#c96442',
        background_color: '#f5f4ee',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: `${base}index.html`,
        // Audio lesson recordings aren't precached (they're large); each is kept once played.
        navigateFallbackDenylist: [/\/audio\/(clips|lessons)\//],
        runtimeCaching: [
          {
            urlPattern: /\/audio\/(clips\/[^/]+|silence)\.mp3$/,
            handler: 'CacheFirst',
            options: { cacheName: 'audio-clips', expiration: { maxEntries: 6000 }, cacheableResponse: { statuses: [200] } },
          },
          {
            urlPattern: /\/audio\/lessons\/[^/]+\.json$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'audio-lessons', networkTimeoutSeconds: 4, cacheableResponse: { statuses: [200] } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
