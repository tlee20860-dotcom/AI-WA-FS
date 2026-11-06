import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhTw from 'element-plus/es/locale/lang/zh-tw'
import App from './App.vue'
import router from './router'
import './style.css'

// 🆕 引入 PWA 註冊函式
import { registerSW } from 'virtual:pwa-register'

const app = createApp(App)

app.use(ElementPlus, { locale: zhTw })
app.use(router)

app.mount('#app')

// 🆕 註冊 Service Worker 並設定自動更新
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('發現新版本，是否立即更新？')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('✅ App 已可離線使用')
  },
})

/* ═══ EOF ═══
F: AI-WA-FS/src/main.js
V: 1793810900
W: ai-wa-fs-001
═══ */