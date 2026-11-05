import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vatdtxdgljowdwvwbzdmt.supabase.co'
const supabaseKey = 'sb_publishable_rY1TM0Zw5-VXisWCMo5Qkg_5M-Q-YOn'

// 🚀 自訂 Fetch 攔截器：將原本要連去 supabase.co 的請求，全部導向我們自己的 Cloudflare 代理
const customFetch = (url, options) => {
  const proxyUrl = url.replace(supabaseUrl, '/api/supabase')
  return fetch(proxyUrl, options)
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: customFetch
  }
})

/* ═══ EOF ═══
F: AI-WA-FS/src/config/supabase.js
V: 1793804900
W: ai-wa-fs-001
═══ */