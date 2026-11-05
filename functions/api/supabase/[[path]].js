export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 處理 CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      }
    });
  }

  const targetUrl = new URL(`https://vatdtxdgljowdwvwbzdmt.supabase.co${url.pathname.replace('/api/supabase', '')}${url.search}`);

  // 手動只挑選需要的 Header，杜絕一切衝突
  const newHeaders = new Headers();
  const allowed = ['apikey', 'authorization', 'content-type', 'accept', 'prefer', 'x-client-info'];
  allowed.forEach(h => {
    if (request.headers.has(h)) newHeaders.set(h, request.headers.get(h));
  });

  // 將 Body 轉為純文字提取
  let body = null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.text();
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: newHeaders,
      body: body,
      redirect: 'manual'
    });

    const newResponse = new Response(response.body, response);
    
    // 移除可能導致瀏覽器報錯的 Cloudflare 標頭
    newResponse.headers.delete('content-encoding');
    newResponse.headers.delete('content-length');
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Headers', '*');
    
    return newResponse;
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Proxy Error: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

/* ═══ EOF ═══
F: AI-WA-FS/functions/api/supabase/[[path]].js
V: 1793805700
W: ai-wa-fs-001
═══ */