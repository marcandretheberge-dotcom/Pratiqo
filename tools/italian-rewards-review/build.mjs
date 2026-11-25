import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
const root = process.cwd(), out = path.resolve('build/italian-rewards-review');
await fs.mkdir(out, { recursive: true });
const shim = path.join(root, 'tools/italian-design-review/next-shims.tsx');
await build({
  entryPoints: ['tools/italian-rewards-review/main.tsx'], outfile: path.join(out, 'app.js'),
  bundle: true, minify: true, jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_SUPABASE_URL': '""' },
  plugins: [{ name: 'isolated-review-adapters', setup(b) {
    b.onResolve({ filter: /^next\/(image|link|navigation)$/ }, a => ({ path: a.path, namespace: 'review-next' }));
    b.onLoad({ filter: /.*/, namespace: 'review-next' }, a => ({
      contents: a.path.endsWith('navigation') ? `export {usePathname,useSearchParams,useRouter,notFound} from ${JSON.stringify(shim)};`
        : `export {${a.path.endsWith('image') ? 'Image' : 'Link'} as default} from ${JSON.stringify(shim)}`,
      loader: 'tsx', resolveDir: root,
    }));
    // Only the public recording URL adapter differs: no Auth, database or service keys.
    b.onLoad({ filter: /[\\/]audio[\\/]audioUrl\.ts$/ }, () => ({
      contents: `import { BUNDLED_AUDIO_REPAIRS } from "./bundledRepairs";
        export const YOPRATIQO_AUDIO_VERSION_PARAM = "v";
        export function buildPublicAudioUrl(p) { return BUNDLED_AUDIO_REPAIRS[p] || "/review-audio/" + p; }`,
      loader: 'ts', resolveDir: path.join(root, 'lib/yo/audio'),
    }));
  }}],
});
const componentCss = await fs.readFile(path.join(out, 'app.css'), 'utf8');
const css = await postcss([tailwind()]).process('@import "tailwindcss" source(none);\n@source "../../components/yo";\n@source "../../components/companion";\n@source "./main.tsx";', { from: path.join(root, 'tools/italian-rewards-review/styles.css') });
await fs.writeFile(path.join(out, 'app.css'), css.css + '\n' + await fs.readFile('components/yo/italian/guided/ItalianCourseExperience.css', 'utf8') + '\n' + componentCss);
await fs.writeFile(path.join(out, 'index.html'), '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><title>YoPratiqo · Italian rewards preview</title><link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/app.css"><style>@font-face{font-family:Inter;src:url(/fonts/inter.woff2) format("woff2");font-display:swap}body{margin:0;font-family:Inter,system-ui,sans-serif}</style></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>');
console.log('Rewards review built. No credentials or application backend.');
