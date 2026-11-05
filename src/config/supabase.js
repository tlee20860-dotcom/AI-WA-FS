import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vatdtxdgljowdwvwbzdmt.supabase.co'
const supabaseKey = 'sb_publishable_rY1TM0Zw5-VXisWCMo5Qkg_5M-Q-YOn'

const customFetch = async (input, init) => {
  const proxyBase = window.location.origin + '/api/supabase'
  const originalBase = 'https://vatdtxdgljowdwvwbzdmt.supabase.co'

  if (typeof input === 'string') {
    return fetch(input.replace(originalBase, proxyBase), init)
  } 
  
  if (input instanceof URL) {
    return fetch(input.toString().replace(originalBase, proxyBase), init)
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
V: 1793805400
W: ai-wa-fs-001
═══ */