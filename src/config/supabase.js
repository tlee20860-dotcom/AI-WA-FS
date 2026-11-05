import { createClient } from '@supabase/supabase-js'

// 🚀 使用代理路徑，避開電信商封鎖
const supabaseUrl = window.location.origin + '/api/supabase'

// 👇 這是你剛才提供的新 Key
const supabaseKey = 'sb_publishable_n31bORorOl534GTFooKJ4w_mcQQcRxt'

export const supabase = createClient(supabaseUrl, supabaseKey)

/* ═══ EOF ═══
F: AI-WA-FS/src/config/supabase.js
V: 1793806000
W: ai-wa-fs-001
═══ */