import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  base: '/',
  plugins: [
    vue()
    // 暫時移除 VitePWA 外掛，避免開發階段網路請求被快取干擾
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true
  }
})

/* ═══ EOF ═══
F: AI-WA-FS/vite.config.js
V: 1793078600
W: ai-wa-fs-001
═══ */