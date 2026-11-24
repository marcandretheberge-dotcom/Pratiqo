import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {randomBytes,createHash} from "node:crypto";
import {spawn} from "node:child_process";
const dir=fileURLToPath(new URL("../../.qa-guided/hotel/",import.meta.url)),pack=path.join(dir,"pack");
const allowed=new Set(JSON.parse(fs.readFileSync(path.join(pack,"pack.json"),"utf8")).files);
const mount="/r/"+randomBytes(20).toString("hex")+"/",expires=Date.now()+86400000;
const types={html:"text/html; charset=utf-8",js:"application/javascript",css:"text/css",webp:"image/webp",png:"image/png",mp3:"audio/mpeg",woff2:"font/woff2",webmanifest:"application/manifest+json"};
let tunnel,origin;
const save=url=>fs.writeFileSync(path.join(dir,"access.json"),JSON.stringify({local:origin+mount,public:url&&url+mount,expires}),{mode:0o600});
const server=http.createServer((req,res)=>{
  res.setHeader("Cache-Control","private, no-store");res.setHeader("Referrer-Policy","no-referrer");res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("X-Robots-Tag","noindex, nofollow");
  res.setHeader("Content-Security-Policy","default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; media-src 'self'; manifest-src 'self'; worker-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  const pathname=(req.url??"").split("?")[0];
  if(Date.now()>=expires||!pathname.startsWith(mount)){res.writeHead(404).end();return;}
  if(!["GET","HEAD"].includes(req.method)){res.writeHead(405,{Allow:"GET, HEAD"}).end();return;}
  const name=pathname.slice(mount.length)||"index.html";if(!allowed.has(name)){res.writeHead(404).end();return;}
  const file=path.join(pack,name),size=fs.statSync(file).size;
  res.setHeader("Content-Type",types[name.split(".").at(-1)]);let start=0,end=size-1,status=200;
  if(req.headers.range&&name.endsWith(".mp3")){
    const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
    if(!m||Number(m[1])>=size||(m[2]&&Number(m[2])<Number(m[1]))){res.writeHead(416,{"Content-Range":"bytes */"+size}).end();return;}
    start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]));status=206;res.setHeader("Content-Range",`bytes ${start}-${end}/${size}`);
  }
  res.writeHead(status,{"Content-Length":end-start+1,"Accept-Ranges":"bytes"});
  if(req.method==="HEAD")res.end();else fs.createReadStream(file,{start,end}).pipe(res);
});
const shutdown=()=>{tunnel?.kill();server.close();};setTimeout(shutdown,86400000).unref();process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);
server.listen(0,"127.0.0.1",()=>{
  origin="http://127.0.0.1:"+server.address().port;save(null);
  if(!process.argv.includes("--share"))return;
  const exe=process.env.SCENARIO_TUNNEL_BIN;
  if(!exe||createHash("sha256").update(fs.readFileSync(exe)).digest("hex")!=="4d2490e74082c5d48dbfedaf92576fa5bd1702379ab88eb7faa0cfbe8dc891b6")throw Error("Unrecognised preview client");
  tunnel=spawn(exe,["tunnel","--url",origin,"--metrics","127.0.0.1:0","--protocol","http2","--no-autoupdate"],{stdio:["ignore","pipe","pipe"],windowsHide:true});
  for(const stream of [tunnel.stdout,tunnel.stderr])stream.on("data",b=>{const u=b.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)?.[0];if(u)save(u);});
  tunnel.on("exit",()=>server.close());
});
