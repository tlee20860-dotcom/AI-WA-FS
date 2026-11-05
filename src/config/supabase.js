import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vatdtxdgljowdwvwbzdmt.supabase.co'
const supabaseKey = 'sb_publishable_rY1TM0Zw5-VXisWCMo5Qkg_5M-Q-YOn'

// 🚀 完美攔截器：處理字串與 Request 物件
const customFetch = async (input, init) => {
  const proxyBase = window.location.origin + '/api/supabase'
  const originalBase = 'https://vatdtxdgljowdwvwbzdmt.supabase.co'

  if (typeof input === 'string') {
    const newUrl = input.replace(originalBase, proxyBase)
    return fetch(newUrl, init)
  } 
  
  if (input instanceof URL) {
    const newUrl = input.toString().replace(originalBase, proxyBase)
    return fetch(newUrl, init)
  }

  if (input instanceof Request) {
    const newUrl = input.url.replace(originalBase, proxyBase)
    const newRequest = new Request(newUrl, input)
    return fetch(newRequest)
  }

  return fetch(input, init)
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: customFetch
  }
})

/* ═══ EOF ═══
F: AI-WA-FS/src/config/supabase.js
V: 1793805300
W: ai-wa-fs-001
═══ */