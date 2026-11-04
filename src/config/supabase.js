import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vatdtxdgljowdwvwbzdmt.supabase.co'
const supabaseKey = 'sb_publishable_rY1TM0Zw5-VXisWCMo5Qkg_5M-Q-YOn'

export const supabase = createClient(supabaseUrl, supabaseKey)

/* ═══ EOF ═══
F: AI-WA-FS/src/config/supabase.js
V: 1793804080
W: ai-wa-fs-001
═══ */