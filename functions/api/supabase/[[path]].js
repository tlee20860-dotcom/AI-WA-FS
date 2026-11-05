export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 構建真實的 Supabase 目標網址
  const targetUrl = new URL(`https://vatdtxdgljowdwvwbzdmt.supabase.co${url.pathname.replace('/api/supabase', '')}${url.search}`);

  // 複製使用者的 Headers
  const newHeaders = new Headers(request.headers);
  
  // 剔除所有可能導致 Cloudflare 崩潰的內部標頭
  newHeaders.delete('host');
  newHeaders.delete('content-length');
  newHeaders.delete('cf-connecting-ip');
  newHeaders.delete('cf-ray');
  newHeaders.delete('cf-visitor');
  newHeaders.delete('x-forwarded-proto');
  newHeaders.delete('x-real-ip');

  // 安全讀取 Body (使用 ArrayBuffer 轉交，連文字解析都不會出錯)
  let body = null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.arrayBuffer();
  }

  try {
    // 發送給 Supabase
    const proxyReq = new Request(targetUrl.toString(), {
      method: request.method,
      headers: newHeaders,
      body: body
    });

    const response = await fetch(proxyReq);

    // 將結果包裝並回傳
    const newResponse = new Response(response.body, response);
    
    // 移除會讓瀏覽器報錯的標頭
    newResponse.headers.delete('content-encoding');
    newResponse.headers.delete('content-length');
    
    return newResponse;
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Proxy Error: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/* ═══ EOF ═══
F: AI-WA-FS/functions/api/supabase/[[path]].js
V: 1793805800
W: ai-wa-fs-001
═══ */