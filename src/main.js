import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhTw from 'element-plus/es/locale/lang/zh-tw'
import App from './App.vue'

const app = createApp(App)

// 啟用 Element Plus 並設定繁體中文語系
app.use(ElementPlus, { locale: zhTw })

app.mount('#app')

/* ═══ EOF ═══
F: AI-WA-FS/src/main.js
V: 1793804100
W: ai-wa-fs-001
═══ */