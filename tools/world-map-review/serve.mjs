import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'build/world-map-review'), port=Number(process.argv[3]||process.env.PORT||55730);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4','.webm':'video/webm'};
http.createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
 const url=new URL(req.url,'http://localhost'), file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep) && file!==root){res.writeHead(403).end();return;}
 try{
  // Public recording reads only. No Auth, database, API key or arbitrary upstream URL.
  if(/^\/storage\/v1\/object\/public\/yopratiqo-audio\/yo\/[a-zA-Z0-9_./-]+\.mp3$/.test(url.pathname)) {
   const recording=await fetch('https://jwlbwmxoradmbuvqfkhe.supabase.co'+url.pathname,{signal:AbortSignal.timeout(15000)});
   res.writeHead(recording.status,{'Content-Type':'audio/mpeg','Cache-Control':'private, max-age=3600'});
   res.end(req.method==='HEAD'?undefined:Buffer.from(await recording.arrayBuffer()));return;
  }
  const target=url.pathname==='/'||url.pathname.startsWith('/yo/')?path.join(root,'index.html'):file;
  const bytes=await fs.readFile(target);
  res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow',
   'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self' blob: https:; connect-src 'self'; frame-src 'none'; form-action 'none'; base-uri 'self'"});
  res.end(req.method==='HEAD'?undefined:bytes);
 }catch{res.writeHead(404).end('Not available in the local review');}
}).listen(port,'127.0.0.1',()=>console.log(`Local review: http://127.0.0.1:${port}`));
