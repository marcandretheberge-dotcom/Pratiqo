import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(sourceDir, "../..");
const out = path.join(repo, "artifacts/cafe-preview");
const vercelMode = process.argv.includes("--vercel");
if (process.argv.slice(2).some((argument) => argument !== "--vercel")) throw new Error("Usage: node scripts/cafe-preview/build.mjs [--vercel]");
const require = createRequire(path.join(repo, "package.json"));
const { build, version: esbuildVersion } = require("esbuild");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const approvedVideoHash = "c057899c53239fd0baf806bf605877b1ec82ecef3dac73840976f96e214be9b6";

const assets = [
  "videos/cafe-world-journey.mp4",
  "images/yo/mandarin/cafe.webp",
  "fonts/inter.woff2",
];
const film = await readFile(path.join(repo, "public", assets[0]));
if (hash(film) !== approvedVideoHash) throw new Error("The approved entrance film checksum changed. Review the replacement before rebuilding this preview.");
await mkdir(out, { recursive: true });

const result = await build({
  absWorkingDir: repo,
  entryPoints: [path.join(sourceDir, "entry.tsx")],
  outfile: path.join(out, "assets/preview.js"),
  bundle: true,
  minify: true,
  metafile: true,
  format: "esm",
  platform: "browser",
  target: ["es2020", "safari15"],
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  alias: { "next/link": path.join(sourceDir, "link.tsx") },
  loader: { ".module.css": "local-css" },
  external: ["/images/*", "/fonts/*"],
  logLevel: "warning",
});

const csp = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; media-src 'self'; font-src 'self'; connect-src 'none'; frame-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'";
const permissions = "camera=(), microphone=(), display-capture=(), geolocation=(), payment=()";
const html = `<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="referrer" content="no-referrer">
<meta name="description" content="Aperçu du Café des langues avec le film approuvé et des conversations de démonstration.">
<meta http-equiv="Content-Security-Policy" content="${csp.replace("; frame-ancestors 'self'", "")}">
<title>Démonstration · Café des langues</title>
<link rel="stylesheet" href="/assets/preview.css">
<script type="module" src="/assets/preview.js"></script>
</head><body>
<div id="cafe-preview-root"><p id="cafe-preview-loading">Ouverture de la démonstration du Café…</p></div>
<noscript>Cette démonstration utilise JavaScript. Les personnes, salons et messages sont fictifs. Aucun appel ni enregistrement réel.</noscript>
</body></html>
`;

const routes = ["index.html", "cafe.html", "cafe/preview/communaute.html"];
for (const route of routes) {
  await mkdir(path.dirname(path.join(out, route)), { recursive: true });
  await writeFile(path.join(out, route), html);
}
for (const asset of assets) {
  await mkdir(path.dirname(path.join(out, asset)), { recursive: true });
  await copyFile(path.join(repo, "public", asset), path.join(out, asset));
}
for (const file of ["review.html", "review.css", "review.js"]) {
  await copyFile(path.join(sourceDir, file), path.join(out, file));
}
await writeFile(path.join(out, "robots.txt"), "User-agent: *\nDisallow: /\n");
await writeFile(path.join(out, "404.html"), `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Page absente de la démonstration</title></head><body><h1>Cette page ne fait pas partie de la démonstration.</h1><p><a href="/cafe">Revenir au Café</a> · <a href="https://www.pratiqo.ca/">Ouvrir Pratiqo</a> · <a href="https://www.pratiqo.ca/yo">Ouvrir YoPratiqo</a></p></body></html>`);
const headers = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Permissions-Policy", value: permissions },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
];
await writeFile(path.join(out, "vercel.json"), JSON.stringify({
  version: 2,
  cleanUrls: true,
  trailingSlash: false,
  headers: [{ source: "/(.*)", headers }],
}, null, 2) + "\n");

const inputPaths = [...Object.keys(result.metafile.inputs).filter((file) => !file.includes("node_modules/")), ...["build.mjs", "review.html", "review.css", "review.js"].map((file) => `scripts/cafe-preview/${file}`)].sort();
const sourceFiles = await Promise.all(inputPaths.map(async (file) => ({ path: file, sha256: hash(await readFile(path.resolve(repo, file))) })));
const outputFiles = ["assets/preview.js", "assets/preview.css", ...routes, ...assets, "review.html", "review.css", "review.js", "robots.txt", "404.html", "vercel.json"];
const files = await Promise.all(outputFiles.map(async (file) => {
  const bytes = await readFile(path.join(out, file));
  return { path: file, bytes: bytes.length, sha256: hash(bytes) };
}));
const gitCommit = process.env.VERCEL_GIT_COMMIT_SHA;
const sourceCommit = gitCommit && /^[a-f0-9]{40}$/i.test(gitCommit)
  ? gitCommit
  : execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8" }).trim();
const manifest = {
  kind: "cafe_static_review_bundle",
  sourceCommit,
  esbuildVersion,
  sourceFiles,
  files,
  fixtureData: true,
  realDatabase: false,
  realAuthentication: false,
  liveCalls: false,
  approvedVideoSha256: approvedVideoHash,
  productionComponents: ["CafeCommunityDemo", "CafeCommunityApp", "CafeHeroMedia"],
};
await writeFile(path.join(out, "preview-build.json"), JSON.stringify(manifest, null, 2) + "\n");

// The Build Output API isolates this review to static assets. No root project
// config, function, cron, environment setting or production gate is modified.
if (vercelMode) {
  const vercelOutput = path.join(repo, ".vercel/output");
  const staticOutput = path.join(vercelOutput, "static");
  // This fixed path is generated build output, never a source/config directory.
  await rm(vercelOutput, { recursive: true, force: true });
  await mkdir(staticOutput, { recursive: true });
  for (const file of [...outputFiles.filter((file) => file !== "vercel.json"), "preview-build.json"]) {
    await mkdir(path.dirname(path.join(staticOutput, file)), { recursive: true });
    await copyFile(path.join(out, file), path.join(staticOutput, file));
  }
  const config = {
    version: 3,
    routes: [
      { src: "/.*", headers: Object.fromEntries(headers.map(({ key, value }) => [key, value])), continue: true },
      { handle: "filesystem" },
      { src: "^/cafe/?$", dest: "/cafe.html" },
      { src: "^/cafe/preview/communaute/?$", dest: "/cafe/preview/communaute.html" },
      { src: "^/review/?$", dest: "/review.html" },
      { src: "/.*", status: 404, dest: "/404.html" },
    ],
  };
  await writeFile(path.join(vercelOutput, "config.json"), JSON.stringify(config, null, 2) + "\n");
}
console.log(JSON.stringify({ output: out, vercelOutput: vercelMode ? path.join(repo, ".vercel/output") : null, files: files.length + 1, bytes: files.reduce((sum, file) => sum + file.bytes, 0), sourceCommit: manifest.sourceCommit, fixtureData: true, realDatabase: false, liveCalls: false }, null, 2));
