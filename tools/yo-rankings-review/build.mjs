import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const root = process.cwd(), output = path.resolve("build/yo-rankings-review");
await fs.mkdir(output, { recursive: true });
const shim = path.join(root, "tools/italian-design-review/next-shims.tsx");
await build({
  entryPoints: ["tools/yo-rankings-review/main.tsx"], outfile: path.join(output, "app.js"),
  bundle: true, minify: true, jsx: "automatic", sourcemap: false,
  define: { "process.env.NODE_ENV": '"production"', "process.env.NEXT_PUBLIC_SUPABASE_URL": '""', "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": '""' },
  plugins: [{ name: "rankings-local-only-adapters", setup(builder) {
    builder.onResolve({ filter: /^next\/(image|link|navigation)$/ }, args => ({ path: args.path, namespace: "ranking-review-next" }));
    builder.onLoad({ filter: /.*/, namespace: "ranking-review-next" }, args => ({
      contents: args.path.endsWith("navigation") ? `export {usePathname,useSearchParams,useRouter,notFound} from ${JSON.stringify(shim)};`
        : `export {${args.path.endsWith("image") ? "Image" : "Link"} as default} from ${JSON.stringify(shim)};`, loader: "tsx", resolveDir: root,
    }));
    builder.onResolve({ filter: /^@\/lib\/supabase$/ }, () => ({ path: "no-account-access", namespace: "ranking-review-auth" }));
    builder.onResolve({ filter: /^@\/components\/AuthProvider$/ }, () => ({ path: "no-auth-provider", namespace: "ranking-review-auth" }));
    builder.onLoad({ filter: /.*/, namespace: "ranking-review-auth" }, args => ({
      contents: args.path === "no-account-access" ? 'export function getSupabaseClient() { throw new Error("Account/network access disabled in isolated ranking review"); }'
        : 'export function useAuth() { return {user:null,loading:false}; }', loader: "ts", resolveDir: root,
    }));
  } }],
});
const components = await fs.readFile(path.join(output, "app.css"), "utf8");
const result = await postcss([tailwind()]).process('@import "tailwindcss" source(none);\n@source "../../components/yo";\n@source "../../components/companion";\n@source "../../components/cafe/community/CafeNavLink.tsx";\n@source "./main.tsx";', { from: path.join(root, "tools/yo-rankings-review/styles.css") });
await fs.writeFile(path.join(output, "app.css"), result.css + "\n" + components + `
@font-face{font-family:Inter;src:url(/fonts/inter.woff2) format("woff2");font-display:swap}
html,body{margin:0;min-height:100%;font-family:Inter,system-ui,sans-serif;background:#f6f9f5;color:#18332e}
.qa-banner{margin:0;padding:8px 12px;background:#fff1bb;color:#604b10;font-size:10px;font-weight:700;line-height:1.5;text-align:center;overflow-wrap:anywhere}
.qa-controls{padding:16px 20px;background:#17342d;color:white}.qa-controls strong{font-size:16px}.qa-controls p{font-size:12px;margin:6px 0 14px;max-width:950px;line-height:1.5}.qa-controls>div{display:flex;align-items:end;flex-wrap:wrap;gap:12px}.qa-controls label{display:grid;gap:4px;font-size:11px}.qa-controls select,.qa-controls button{font:inherit;font-size:12px;background:white;color:#18332e;border:1px solid #9ab4a7;border-radius:7px;min-height:36px;padding:7px 10px}.qa-controls a{color:#c9ead8;font-size:12px;text-decoration:underline;padding:9px}.qa-frame{display:block;max-width:100%;height:calc(100vh - 145px);min-height:550px;border:0;margin:0 auto;background:#f6f9f5;box-shadow:0 0 0 1px #c9d4cd}
`);
await fs.writeFile(path.join(output, "index.html"), '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>LOCAL QA · Synthetic YoPratiqo rankings</title><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>');
console.log("Ranking review built with synthetic data only; no account, API, messages or storage.");
