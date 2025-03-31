import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/my-world-atlas/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: true,
    // 新規追加：静的ファイルの処理
    rollupOptions: {
      output: {
        // CSSと画像ファイルを分ける
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          let ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            ext = 'img';
          }
          return `assets/${ext}/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
  },
  // モバイル対応を強化するための設定
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: true
  }
})
