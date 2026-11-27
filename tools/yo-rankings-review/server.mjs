import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const output = path.resolve("build/yo-rankings-review"), assets = path.resolve("public");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".woff2": "font/woff2" };
export const server = http.createServer(async (request, response) => {
  response.setHeader("X-Robots-Tag", "noindex, nofollow");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; frame-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'");
  if (!/^(127\.0\.0\.1|localhost)(:55857)?$/.test(request.headers.host ?? "")) return response.writeHead(403).end("Loopback host required");
  if (!["GET", "HEAD"].includes(request.method)) return response.writeHead(405).end("Read-only visual review");
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    if (pathname.includes("..") || pathname.includes("\\") || pathname.includes("\0")) return response.writeHead(400).end();
    let file;
    if (pathname === "/") file = path.join(output, "index.html");
    else if (["/app.js", "/app.css"].includes(pathname)) file = path.join(output, pathname);
    else if (pathname === "/brand/yopratiqo-logo.png") file = path.join(assets, pathname);
    else if (/^\/(images|companion|fonts)\/[a-zA-Z0-9_./%-]+\.(png|jpg|webp|svg|woff2)$/.test(pathname)) file = path.join(assets, pathname);
    else return response.writeHead(404).end("Not part of isolated review");
    const bytes = await fs.readFile(file);
    response.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" });
    response.end(request.method === "HEAD" ? undefined : bytes);
  } catch { response.writeHead(404).end("Local review asset unavailable"); }
});
server.listen(55857, "127.0.0.1", () => console.log("LOCAL EMPTY-STATE REVIEW: http://127.0.0.1:55857/"));
