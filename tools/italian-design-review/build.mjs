import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
const root=process.cwd();
const out=path.resolve(process.argv[2] ?? 'review-dist');
await fs.mkdir(out,{recursive:true});
const shim=path.join(root,'tools/italian-design-review/next-shims.tsx');
await build({entryPoints:['tools/italian-design-review/main.tsx'],outfile:path.join(out,'app.js'),bundle:true,minify:true,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_SUPABASE_URL':'"https://jwlbwmxoradmbuvqfkhe.supabase.co"'},plugins:[{name:'next-review-adapters',setup(b){b.onResolve({filter:/^next\/(image|link|navigation)$/},a=>({path:a.path,namespace:'review-next'}));b.onLoad({filter:/.*/,namespace:'review-next'},a=>({contents:a.path.endsWith('navigation')?`export {usePathname,useSearchParams,useRouter,notFound} from ${JSON.stringify(shim)}`:`export {${a.path.endsWith('image')?'Image':'Link'} as default} from ${JSON.stringify(shim)}`,loader:'tsx',resolveDir:root}));}}]});
const css=await postcss([tailwind()]).process('@import "tailwindcss" source(none);\n@source "../../components/yo";\n@source "../../components/companion";\n@source "../../app/yo/langues/italien/parcours";', {from:path.join(root,'tools/italian-design-review/styles.css')});
const experience=await fs.readFile('components/yo/italian/guided/ItalianCourseExperience.css','utf8');
await fs.writeFile(path.join(out,'app.css'),css.css+'\n'+experience+'\nbody{margin:0;font-family:Inter,system-ui,sans-serif} .review-banner{padding:8px 16px;background:#e8eee6;color:#50654e;font-size:11px;display:flex;align-items:center;justify-content:center;gap:12px}.review-banner select{max-width:160px;background:transparent;font:inherit;border:1px solid #bfcfba;border-radius:6px;padding:4px} @font-face{font-family:Inter;src:url(/fonts/inter.woff2) format("woff2");font-weight:100 900;font-display:swap}');
for(const sub of ['images/yo/italian/worlds','companion','fonts']){await fs.cp(path.join(root,'public',sub),path.join(out,sub),{recursive:true});}
await fs.writeFile(path.join(out,'index.html'),'<!doctype html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><title>YoPratiqo · Aperçu Italie</title><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>');
console.log('Built review from actual course components: '+out);
// Explicit route files keep review links working on static hosts without SPA rewrites.
const html=await fs.readFile(path.join(out,'index.html'),'utf8');
for(let n=1;n<=12;n++) {
  const id='u'+String(n).padStart(2,'0');
  for(const suffix of ['', '/vocabulaire', '/bilan']) {
    const folder=path.join(out,'yo/langues/italien/parcours',id+suffix);
    await fs.mkdir(folder,{recursive:true}); await fs.writeFile(path.join(folder,'index.html'),html);
  }
}
await fs.mkdir(path.join(out,'yo/langues'),{recursive:true});
await fs.writeFile(path.join(out,'yo/langues/index.html'),html);
await fs.writeFile(path.join(out,'mobile.html'),'<!doctype html><html><head><title>YoPratiqo · Mobile review</title><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#e7e9e3}iframe{width:390px;height:844px;border:1px solid #c8cfc6;border-radius:24px;background:#fff;box-shadow:0 12px 50px #2341}</style></head><body><iframe title="Aperçu mobile" src="/?unit=u08"></iframe></body></html>');
