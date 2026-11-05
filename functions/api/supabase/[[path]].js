export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // 1. 取得原本的請求路徑 (將 /api/supabase 替換掉)
  const targetPath = url.pathname.replace('/api/supabase', '');
  
  // 2. 組合真正的 Supabase 網址
  const targetUrl = 'https://vatdtxdgljowdwvwbzdmt.supabase.co' + targetPath + url.search;

  // 3. 建立新的請求轉發給 Supabase
  const newRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body
  });

  try {
    // 4. 發送請求並回傳結果
    const response = await fetch(newRequest);
    return response;
  } catch (error) {
    // 如果連線失敗，回傳錯誤訊息
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/* ═══ EOF ═══
F: AI-WA-FS/functions/api/supabase/[[path]].js
V: 1793805000
W: ai-wa-fs-001
═══ */