export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 1. 處理 CORS 預檢請求 (OPTIONS)
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

  // 2. 構建目標 URL
  const targetPath = url.pathname.replace('/api/supabase', '');
  const targetUrl = 'https://vatdtxdgljowdwvwbzdmt.supabase.co' + targetPath + url.search;

  // 3. 清理 Headers（必須移除 host 避免衝突）
  const newHeaders = new Headers(request.headers);
  newHeaders.delete('host');
  newHeaders.delete('content-length'); // 避免長度不匹配

  // 4. 安全讀取 Body（避免 Cloudflare Stream 錯誤）
  let body = undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text();
  }

  try {
    // 5. 轉發請求給 Supabase
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: newHeaders,
      body: body,
      redirect: 'follow'
    });

    // 6. 回傳結果並加上 CORS 標頭
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Headers', '*');
    
    return newResponse;
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Proxy Error', 
      message: error.message 
    }), {
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
V: 1793805300
W: ai-wa-fs-001
═══ */