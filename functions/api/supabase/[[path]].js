export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 1. 處理跨域預檢請求 (OPTIONS)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  // 2. 取得原本的請求路徑
  const targetPath = url.pathname.replace('/api/supabase', '');
  const targetUrl = 'https://vatdtxdgljowdwvwbzdmt.supabase.co' + targetPath + url.search;

  // 3. 建立新的請求轉發給 Supabase
  const newRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body
  });

  try {
    // 4. 發送請求
    const response = await fetch(newRequest);
    
    // 5. 建立新的 Response，並強制加上 CORS 標頭
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
    
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    return newResponse;
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

/* ═══ EOF ═══
F: AI-WA-FS/functions/api/supabase/[[path]].js
V: 1793805100
W: ai-wa-fs-001
═══ */