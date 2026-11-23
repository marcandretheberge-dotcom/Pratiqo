import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const build = path.resolve('build/italian-rewards-review'), assets = path.resolve('public');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.jpg':'image/jpeg', '.woff2':'font/woff2', '.mp3':'audio/mpeg', '.mp4':'video/mp4' };
const server = http.createServer(async(req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'");
  if (!['GET', 'HEAD'].includes(req.method)) return res.writeHead(405).end();
  try {
    const url = new URL(req.url, 'http://127.0.0.1'), p = decodeURIComponent(url.pathname);
    if (p.includes('..') || p.includes('\\') || p.includes('\0')) return res.writeHead(400).end();
    if (/^\/review-audio\/yo\/[a-zA-Z0-9_/-]+\.mp3$/.test(p)) {
      const response = await fetch('http://127.0.0.1:55421/storage/v1/object/public/yopratiqo-audio/' + p.slice('/review-audio/'.length), { signal: AbortSignal.timeout(10000) });
      res.writeHead(response.status, { 'Content-Type':'audio/mpeg' });
      return res.end(req.method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()));
    }
    let file;
    if (p === '/' || p === '/yo/review/italian-rewards') file = path.join(build, 'index.html');
    else if (['/app.js','/app.css'].includes(p)) file = path.join(build, p);
    else if (/^\/(images|companion|fonts|audio|videos)\/[a-zA-Z0-9_./%-]+\.(png|jpg|webp|svg|woff2|mp3|mp4)$/.test(p)) file = path.join(assets, p);
    else return res.writeHead(404).end('Not part of this isolated review');
    const bytes = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { res.writeHead(404).end('Review asset unavailable'); }
});
server.listen(55851, '127.0.0.1', () => console.log('Local rewards review: http://127.0.0.1:55851/'));
