import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const source=path.resolve('build/italian-travel-review'),output=path.resolve('build/italian-travel-host/.vercel/output');
const bundle=await fs.readFile(path.join(source,'app.js'),'utf8');
assert.equal(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'','Commit the reviewed files before packaging');
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert(!bundle.includes('http://127.0.0.1:55810'),'Build with --share first');
assert(!/SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|RESEND_API_KEY/.test(bundle));
await fs.mkdir(path.join(output,'static'),{recursive:true});
// Deliberate static allowlist: no .next, functions, environment, account or backend.
for(const file of ['app.js','app.css','index.html','images/yo/italian','images/yo/vocabulary','companion/travel','fonts']) {
  await fs.mkdir(path.dirname(path.join(output,'static',file)),{recursive:true});
  await fs.cp(path.join(source,file),path.join(output,'static',file),{recursive:true});
}
await fs.mkdir(path.join(output,'static/evidence'),{recursive:true});
for(const file of await fs.readdir(path.join(source,'evidence')))if(/\.(png|webm|html|json)$/.test(file))await fs.copyFile(path.join(source,'evidence',file),path.join(output,'static/evidence',file));
await fs.writeFile(path.join(output,'static/review-build.json'),JSON.stringify({sourceSha,node:process.version,bundleSha256:createHash('sha256').update(bundle).digest('hex'),target:'isolated-static-preview',builtAt:new Date().toISOString()},null,2));
await fs.writeFile(path.join(output,'config.json'),JSON.stringify({version:3,routes:[
 {src:'/(.*)',headers:{'X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob: https://jwlbwmxoradmbuvqfkhe.supabase.co; connect-src 'self'; frame-src 'none'; form-action 'none'; base-uri 'self'; frame-ancestors 'none'"},continue:true},
 {src:'/(.*)',methods:['POST','PUT','PATCH','DELETE','OPTIONS'],status:405},
 {src:'/(api|auth|admin|_supabase)(/.*)?',status:404},
 {handle:'filesystem'},{src:'/',dest:'/index.html'},{src:'/yo(/.*)?',dest:'/index.html'},{src:'/(.*)',status:404}
]},null,2));
console.log('Static Preview packaged: no functions, secrets or production writes.');
