import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
const root=process.cwd(), out=path.resolve('build/italian-travel-review');
const audioOrigin=process.argv.includes('--share')?'https://jwlbwmxoradmbuvqfkhe.supabase.co':'http://127.0.0.1:55810';
await fs.mkdir(out,{recursive:true});
const shim=path.join(root,'tools/italian-design-review/next-shims.tsx');
await build({entryPoints:['tools/italian-travel-review/main.tsx'],outfile:path.join(out,'app.js'),bundle:true,minify:true,jsx:'automatic',
 define:{'process.env.NODE_ENV':'"production"','process.env.NEXT_PUBLIC_SUPABASE_URL':JSON.stringify(audioOrigin)},
 plugins:[{name:'isolated-adapters',setup(b){
  b.onResolve({filter:/^next\/(image|link|navigation)$/},a=>({path:a.path,namespace:'review-next'}));
  b.onLoad({filter:/.*/,namespace:'review-next'},a=>({contents:a.path.endsWith('navigation')?`export {usePathname,useSearchParams,useRouter,notFound} from ${JSON.stringify(shim)};`:`export {${a.path.endsWith('image')?'Image':'Link'} as default} from ${JSON.stringify(shim)}`,loader:'tsx',resolveDir:root}));
 }}]});
const css=await postcss([tailwind()]).process('@import "tailwindcss" source(none);\n@source "../../components/yo";\n@source "../../components/companion";\n@source "./main.tsx";',{from:path.join(root,'tools/italian-travel-review/styles.css')});
await fs.writeFile(path.join(out,'app.css'),css.css+'\n'+await fs.readFile('components/yo/italian/guided/ItalianCourseExperience.css','utf8')+'\n'+await fs.readFile('tools/italian-travel-review/review.css','utf8'));
for(const sub of ['images/yo/italian','images/yo/vocabulary','companion/travel','fonts']) {
 await fs.mkdir(path.dirname(path.join(out,sub)),{recursive:true});
 await fs.cp(path.join(root,'public',sub),path.join(out,sub),{recursive:true});
}
await fs.writeFile(path.join(out,'index.html'),'<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="italian-travel-review-only" content="true"><title>YoPratiqo · Le voyage italien</title><link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>');
console.log('Italian travel preview built, no account/API credentials or backend writes.');
