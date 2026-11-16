import { spawn } from 'node:child_process';
import path from 'node:path';
import { base, databaseOrigin, localCafeEnv, root } from './env.mjs';

const mode = process.argv[2];
if (!['build', 'start'].includes(mode)) throw new Error('Use build or start');
const env = await localCafeEnv();
const response = await fetch(`${databaseOrigin}/rest/v1/teachers?select=id&limit=1`, {
  headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  signal: AbortSignal.timeout(10_000), redirect: 'error',
});
if (!response.ok) throw new Error(`Local database check failed: HTTP ${response.status}`);
console.log(`Café local ${mode}: ${base}. Real local Auth/DB, video and external sending disabled.`);
const child = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), mode,
  ...(mode === 'start' ? ['--hostname', '127.0.0.1', '--port', '55820'] : [])], {
  cwd: root, env, stdio: 'inherit', windowsHide: true,
});
child.on('exit', code => { process.exitCode = code ?? 1; });
child.on('error', () => { console.error('Local application process failed to start'); process.exitCode = 1; });
