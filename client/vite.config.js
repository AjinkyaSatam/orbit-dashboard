import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const siteUrl = (env.VITE_SITE_URL || 'http://localhost:5173').replace(/\/$/, '');

  const hasFrontView = fs.existsSync(path.resolve(import.meta.dirname, 'public/images/front-view.png'));
  const hasUsecaseHome = fs.existsSync(path.resolve(import.meta.dirname, 'public/images/usecases/home.webp'));
  const hasUsecaseOutdoor = fs.existsSync(path.resolve(import.meta.dirname, 'public/images/usecases/outdoor.webp'));
  const hasUsecaseStorage = fs.existsSync(path.resolve(import.meta.dirname, 'public/images/usecases/storage.webp'));

  return {
    define: {
      __OPTIONAL_ASSETS__: JSON.stringify({
        frontView: hasFrontView,
        usecases: {
          home: hasUsecaseHome,
          outdoor: hasUsecaseOutdoor,
          storage: hasUsecaseStorage,
        },
      }),
    },
    plugins: [
      react(),
      {
        name: 'html-transform-og',
        transformIndexHtml(html) {
          return html
            .replace(/%OG_IMAGE_URL%/g, `${siteUrl}/og-image.png`)
            .replace(/%SITE_URL%/g, siteUrl);
        },
      },
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:5000',
          ws: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    optimizeDeps: {
      include: ['react-is', 'recharts'],
    },
  };
});
