export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 1. 處理 CORS 預檢請求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || '*',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  // 2. 構建目標 URL
  const targetUrl = new URL('https://vatdtxdgljowdwvwbzdmt.supabase.co');
  targetUrl.pathname = url.pathname.replace('/api/supabase', '');
  targetUrl.search = url.search;

  // 3. 清理 Headers
  const newHeaders = new Headers(request.headers);
  newHeaders.delete('host');
  newHeaders.delete('content-length');
  newHeaders.delete('cf-connecting-ip');

  // 4. 安全讀取 Body (轉成純文字)
  let body = undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text(); 
  }

  try {
    // 5. 轉發請求給 Supabase
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: newHeaders,
      body: body,
      redirect: 'manual'
    });

    // 6. 構建 Response
    const newResponse = new Response(response.body, response);
    
    // 7. 強制寫入 CORS 標頭
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Expose-Headers', '*');
    
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
V: 1793805400
W: ai-wa-fs-001
═══ */