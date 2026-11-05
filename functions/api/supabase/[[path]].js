export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 1. 處理 CORS 預檢
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || '*',
      }
    });
  }

  // 2. 構建目標網址
  const targetPath = url.pathname.replace('/api/supabase', '');
  const targetUrl = `https://vatdtxdgljowdwvwbzdmt.supabase.co${targetPath}${url.search}`;

  // 3. 只保留核心 Header，避免 Cloudflare 內部衝突
  const newHeaders = new Headers();
  ['apikey', 'authorization', 'content-type', 'accept', 'prefer'].forEach(h => {
    if (request.headers.has(h)) newHeaders.set(h, request.headers.get(h));
  });

  // 4. 安全讀取 Body (使用 ArrayBuffer 確保格式不跑掉)
  let body = null;
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    body = await request.arrayBuffer();
  }

  try {
    // 5. 發送請求
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: newHeaders,
      body: body
    });

    // 6. 構建回傳結果
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });

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
V: 1793805500
W: ai-wa-fs-001
═══ */