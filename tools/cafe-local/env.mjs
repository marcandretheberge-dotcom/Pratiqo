import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const base = 'http://localhost:55820';
export const databaseOrigin = 'http://127.0.0.1:55421';

export async function localCafeEnv() {
  for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    if (existsSync(path.join(root, name))) throw new Error('Refusing application environment files');
  }
  // This adapter checks the PR405 Docker identity/network and returns an OS-only
  // allowlist plus the local stack's credentials, never inherited provider keys.
  const adapter = path.resolve(root, '../pr405-local-sandbox/local-env.cjs');
  if (!existsSync(adapter)) throw new Error('The documented PR405 local stack adapter is required');
  const env = (await import(pathToFileURL(adapter).href)).default.getLocalEnv();
  Object.assign(env, {
    NEXT_PUBLIC_SUPABASE_URL: databaseOrigin,
    APP_BASE_URL: base, SITE_URL: base, NEXT_PUBLIC_SITE_URL: base,
    STRIPE_CHECKOUT_BASE_URL: base,
    CAFE_LOCAL_SUPABASE_CONNECT_ORIGIN: databaseOrigin,
    VERCEL_ENV: 'development',
    CAFE_V1_ENABLED: 'true', CAFE_COMMUNITY_ENABLED: 'true',
    CAFE_ROOM_PROVIDER_ENABLED: 'false', CAFE_COMMUNITY_PREVIEW_ENABLED: 'false',
  });
  for (const key of ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!env[key]) throw new Error(`Missing local configuration: ${key}`);
  }
  for (const key of ['STRIPE_SECRET_KEY', 'RESEND_API_KEY', 'TWILIO_AUTH_TOKEN', 'CRON_SECRET', 'SENTRY_AUTH_TOKEN', 'DAILY_API_KEY']) {
    if (env[key]) throw new Error('Unexpected external-service credential');
  }
  return env;
}
