import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

// Build Output API: static files only. Never upload .next, environment files or functions.
const source=path.resolve('build/world-map-review');
const output=path.resolve('build/world-map-host/.vercel/output');
const bundle=await fs.readFile(path.join(source,'app.js'),'utf8');
assert(!bundle.includes('http://127.0.0.1:55730'),'Build with --share before packaging');
assert(!/SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|RESEND_API_KEY/.test(bundle),'Unexpected credential reference');
await fs.mkdir(path.join(output,'static'),{recursive:true});
for(const item of ['app.js','app.css','index.html','images','companion','fonts','audio','videos']) {
  try {await fs.cp(path.join(source,item),path.join(output,'static',item),{recursive:true});}
  catch(error) {if(error.code!=='ENOENT'||item!=='videos')throw error;}
}
await fs.mkdir(path.join(output,'static/evidence'),{recursive:true});
for(const file of await fs.readdir(path.join(source,'evidence'))) {
  if(/\.(png|webm|html|json)$/.test(file)) await fs.copyFile(path.join(source,'evidence',file),path.join(output,'static/evidence',file));
}
await fs.writeFile(path.join(output,'config.json'),JSON.stringify({version:3,routes:[
  {src:'/(.*)',headers:{'X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer',
    'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob: https://jwlbwmxoradmbuvqfkhe.supabase.co; connect-src 'self'; frame-src 'none'; form-action 'none'; base-uri 'self'; frame-ancestors 'none'"},continue:true},
  {src:'/(.*)',methods:['POST','PUT','PATCH','DELETE','OPTIONS'],status:405},
  {src:'/(api|auth|admin|_supabase)(/.*)?',status:404},
  {handle:'filesystem'},
  {src:'/',dest:'/index.html'},
  {src:'/yo(/.*)?',dest:'/index.html'},
  {src:'/(.*)',status:404},
]},null,2));
console.log('Static Preview prepared: no functions, keys, database, Auth, payments or sends.');
