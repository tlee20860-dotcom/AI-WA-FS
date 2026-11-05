import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhTw from 'element-plus/es/locale/lang/zh-tw'
import App from './App.vue'
import router from './router'
import './style.css'

const app = createApp(App)

app.use(ElementPlus, { locale: zhTw })
app.use(router)

app.mount('#app')

// 🚨 強制反註冊所有舊的 Service Worker，徹底清除快取干擾
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

/* ═══ EOF ═══
F: AI-WA-FS/src/main.js
V: 1793806100
W: ai-wa-fs-001
═══ */