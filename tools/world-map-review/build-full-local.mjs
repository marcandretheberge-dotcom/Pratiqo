import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
  if (fs.existsSync(path.join(root, name))) throw new Error('Refusing application environment files');
}
// Reuse the established local-only allowlist, Docker identity check and fetch guard.
// This file is an operator tool, never imported by the application or review bundle.
const adapter = path.resolve(root, '../pr405-local-sandbox/local-env.cjs');
if (!fs.existsSync(adapter)) throw new Error('The documented PR405 local stack adapter is required');
const env = (await import(pathToFileURL(adapter).href)).default.getLocalEnv();
env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:55421';
env.APP_BASE_URL = env.SITE_URL = env.NEXT_PUBLIC_SITE_URL = 'http://127.0.0.1:55730';
env.STRIPE_CHECKOUT_BASE_URL = env.APP_BASE_URL;
for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!env[key]) throw new Error(`Missing local configuration: ${key}`);
}
for (const key of ['STRIPE_SECRET_KEY', 'RESEND_API_KEY', 'TWILIO_AUTH_TOKEN', 'CRON_SECRET', 'SENTRY_AUTH_TOKEN']) {
  if (env[key]) throw new Error('Unexpected external-service credential in local build');
}
async function main() {
  const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/teachers?select=id&limit=1`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Local teachers read failed: HTTP ${response.status}`);
  console.log('Local Supabase read OK; credentials stay in memory. No external-service credentials loaded.');
  const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'build'], {
    cwd: root, env, stdio: 'inherit', windowsHide: true,
  });
  child.on('exit', code => {
    fs.mkdirSync(path.join(root,'build/world-map-review'),{recursive:true});
    fs.writeFileSync(path.join(root,'build/world-map-review/full-build-result.json'),JSON.stringify({exitCode:code??1,backend:'isolated-local',command:'next build',finishedAt:new Date().toISOString()},null,2));
    process.exitCode = code ?? 1;
  });
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
