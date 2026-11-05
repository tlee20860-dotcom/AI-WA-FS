export async function onRequest(context) {
  const { request, params } = context;
  
  // 取得目標路徑 (例如 auth/v1/token 或 rest/v1/...)
  const pathArray = params.path || [];
  const pathString = Array.isArray(pathArray) ? pathArray.join('/') : pathArray;
  
  // 你的 Supabase 原始網址
  const supabaseUrl = 'https://vatdtxdgljowdwvwbzdmt.supabase.co';
  
  // 構建新的目標 URL，包含原有的 query 參數
  const url = new URL(request.url);
  const targetUrl = new URL(`${supabaseUrl}/${pathString}${url.search}`);
  
  // 複製原有的 Header（包含 Authorization 和 apikey）
  const newHeaders = new Headers(request.headers);
  
  // 建立轉發請求
  const newRequest = new Request(targetUrl, {
    method: request.method,
    headers: newHeaders,
    body: request.body,
    redirect: 'manual'
  });

  // 發送給 Supabase
  const response = await fetch(newRequest);
  
  // 回傳結果給前端
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
  
  // 確保跨域安全性
  newResponse.headers.set('Access-Control-Allow-Origin', '*');
  
  return newResponse;
}

/* ═══ EOF ═══
F: AI-WA-FS/functions/api/supabase/[[path]].js
V: 1793804800
W: ai-wa-fs-001
═══ */