import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vatdtxdgljowdwvwbzdmt.supabase.co'
const supabaseKey = 'sb_publishable_rY1TM0Zw5-VXisWCMo5Qkg_5M-Q-YOn'

// 🚀 自訂 Fetch 攔截器：安全地將請求導向代理
const customFetch = (url, options) => {
  const urlString = url.toString();
  // 確保只替換開頭的網址部分
  const proxyUrl = urlString.replace(supabaseUrl, window.location.origin + '/api/supabase');
  return fetch(proxyUrl, options);
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: customFetch
  }
})

/* ═══ EOF ═══
F: AI-WA-FS/src/config/supabase.js
V: 1793805200
W: ai-wa-fs-001
═══ */