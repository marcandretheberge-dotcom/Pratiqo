// PACK and REVISION are prepended by the pack builder. Cache only this review.
const base=self.registration.scope;
const prefix="yo-train:"+new URL(base).pathname+":";
const cacheName=prefix+REVISION;
const urls=PACK.map(name=>new URL(name,base).href);
const index=new URL("index.html",base).href;
self.addEventListener("install",e=>e.waitUntil((async()=>{
  const cache=await caches.open(cacheName);
  await cache.addAll(urls.map(url=>new Request(url,{cache:"reload"})));
  await self.skipWaiting();
})()));
self.addEventListener("activate",e=>e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k.startsWith(prefix)&&k!==cacheName)await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener("message",e=>{
  if(e.data==="check-pack")e.waitUntil((async()=>{
    const cache=await caches.open(cacheName);
    const saved=new Set((await cache.keys()).map(r=>r.url));e.ports[0]?.postMessage(urls.every(u=>saved.has(u))?"complete":"incomplete");
  })());
});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const u=new URL(e.request.url);u.search="";u.hash="";
  const target=u.href===base?index:u.href;
  if(!urls.includes(target))return;
  e.respondWith((async()=>{
    const stored=await (await caches.open(cacheName)).match(target);
    if(!stored)return fetch(e.request);
    const range=e.request.headers.get("Range");
    if(!range||!target.endsWith(".mp3"))return stored;
    // WebKit requests byte ranges even for short, fully downloaded clips.
    const bytes=await stored.arrayBuffer(),n=bytes.byteLength,match=/^bytes=(\d*)-(\d*)$/.exec(range);
    const start=match?.[1]?Number(match[1]):Math.max(0,n-Number(match?.[2]));
    const end=match?.[1]&&match[2]?Math.min(n-1,Number(match[2])):n-1;
    if(!match||(!match[1]&&!match[2])||start>end||start>=n)return new Response(null,{status:416,headers:{"Content-Range":"bytes */"+n}});
    return new Response(bytes.slice(start,end+1),{status:206,headers:{"Content-Type":"audio/mpeg","Accept-Ranges":"bytes","Content-Range":`bytes ${start}-${end}/${n}`,"Content-Length":String(end-start+1)}});
  })());
});
