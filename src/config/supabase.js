import { createClient } from '@supabase/supabase-js'

// 直接使用你自己的網域加上 /api/supabase 作為 Supabase 的網址
const supabaseUrl = window.location.origin + '/api/supabase'
const supabaseKey = 'sb_publishable_rY1TM0Zw5-VXisWCMo5Qkg_5M-Q-YOn'

// 這樣一來，Supabase 所有的請求（登入、資料庫）都會自動打向我們自己的代理
export const supabase = createClient(supabaseUrl, supabaseKey)

/* ═══ EOF ═══
F: AI-WA-FS/src/config/supabase.js
V: 1793805800
W: ai-wa-fs-001
═══ */