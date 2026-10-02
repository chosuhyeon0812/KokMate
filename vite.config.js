import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // 상대 경로로 빌드해서 GitHub Pages 같은 하위 경로에 올려도 동작하도록 한다.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // 예전 버전이 등록해둔 service-worker.js 를 같은 이름으로 덮어써서, 기존 사용자도 새 버전으로 자동 교체되게 한다.
      filename: 'service-worker.js',
      includeAssets: ['icons/apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,ico,webmanifest}'],
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: '배드민턴 매칭',
        short_name: '배드민턴매칭',
        description: '소규모 배드민턴 모임 경기 운영 도우미',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#f4f9fa',
        theme_color: '#0b5566',
        lang: 'ko',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
});
