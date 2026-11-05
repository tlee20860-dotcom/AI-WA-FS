import { createClient } from '@supabase/supabase-js'

// 🚀 直接把代理網址當作 Supabase 的網址，不再需要任何複雜的攔截器！
const supabaseUrl = window.location.origin + '/api/supabase'
const supabaseKey = 'sb_publishable_rY1TM0Zw5-VXisWCMo5Qkg_5M-Q-YOn'

export const supabase = createClient(supabaseUrl, supabaseKey)

/* ═══ EOF ═══
F: AI-WA-FS/src/config/supabase.js
V: 1793805900
W: ai-wa-fs-001
═══ */