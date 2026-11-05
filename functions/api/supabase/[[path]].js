export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 1. 處理預檢請求 (CORS)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  // 2. 目標 URL
  const targetPath = url.pathname.replace('/api/supabase', '');
  const targetUrl = `https://vatdtxdgljowdwvwbzdmt.supabase.co${targetPath}${url.search}`;

  // 3. 🚨 絕對白名單：只傳遞這些 Header，杜絕一切 530 崩潰
  const newHeaders = new Headers();
  const allowed = ['apikey', 'authorization', 'content-type', 'accept', 'prefer', 'x-client-info', 'cache-control', 'range'];
  allowed.forEach(h => {
    const val = request.headers.get(h);
    if (val) newHeaders.set(h, val);
  });

  // 4. 安全讀取 Body
  let body = null;
  if (!['GET', 'HEAD'].includes(request.method)) {
    body = await request.arrayBuffer();
  }

  try {
    // 5. 發送給 Supabase
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: newHeaders,
      body: body
    });

    // 6. 🚨 安全地重建 Headers 物件，避免修改到 Cloudflare 的受保護屬性
    const resHeaders = new Headers(response.headers);
    resHeaders.delete('content-encoding');
    resHeaders.delete('content-length');
    resHeaders.set('Access-Control-Allow-Origin', '*');
    resHeaders.set('Access-Control-Allow-Headers', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

/* ═══ EOF ═══
F: AI-WA-FS/functions/api/supabase/[[path]].js
V: 1793805900
W: ai-wa-fs-001
═══ */