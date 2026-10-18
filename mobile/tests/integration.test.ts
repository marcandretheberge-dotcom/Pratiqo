import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as client from '../../lib/mobile/client';
import * as server from '../../lib/mobile/server';
import { MOBILE_AGENT } from '../../shared/mobileProtocol';

const origin = 'https://mobile-test.example.com';
const config = { protocol: 1, enabled: true, webOrigin: origin, authOrigin: 'https://synthetic.supabase.co', sandboxCheckoutEnabled: true };

function loadModule(path: string, dependencies: Record<string, unknown>, globals: Record<string, unknown> = {}) {
  const source = readFileSync(resolve('..', path), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
  vm.runInNewContext(output, {
    exports, require: (id: string) => dependencies[id] ?? {},
    Request, Response, URL, process, console, ...globals,
  }, { filename: path });
  return exports;
}

test('real login function keeps normal web navigation; native cancellation releases PKCE lock for retry', async () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalFetch = globalThis.fetch;
  const target = new EventTarget();
  const assigned: string[] = [];
  const posted: { id: string; kind: string; url: string }[] = [];
  const fakeWindow = Object.assign(target, {
    location: { origin, assign: (url: string) => assigned.push(url) },
    ReactNativeWebView: { postMessage: (raw: string) => posted.push(JSON.parse(raw)) },
  });
  let agent = 'Mozilla/5.0';
  let pkceCalls = 0;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, get: () => ({ userAgent: agent }) });
  globalThis.fetch = async () => Response.json(config);
  const deps = {
    './supabase': { getSupabaseClient: () => ({ auth: { signInWithOAuth: async () => {
      pkceCalls++; return { data: { url: 'https://synthetic.supabase.co/auth/v1/authorize' }, error: null };
    } } }) },
    '@/lib/auth/oauthCallback': { resolveOAuthRedirectOrigin: () => origin, buildOAuthCallbackUrl: () => `${origin}/auth/callback` },
    '@/lib/auth/oauthReturnHandoff': { markOAuthReturnPending() {} },
    '@/lib/auth/teacherOnboardingIntent': { hasTeacherOnboardingIntent: () => false },
    '@/lib/mobile/client': client,
  };
  const module = loadModule('lib/auth.ts', deps, { window: fakeWindow });
  try {
    await module.loginWithGoogle();
    assert.equal(assigned.length, 1);
    assert.equal(posted.length, 0);
    agent = `Mozilla/5.0 ${MOBILE_AGENT}`;
    const first = module.loginWithGoogle();
    const rejection = assert.rejects(first, /pas été confirmée/);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(posted.length, 1);
    await assert.rejects(module.loginWithGoogle(), /déjà en cours/);
    assert.equal(pkceCalls, 2, 'overlap must not overwrite the verifier cookie');
    fakeWindow.dispatchEvent(new CustomEvent('pratiqo:native-result', { detail: { id: posted[0].id, ok: false } }));
    await rejection;
    const retry = module.loginWithGoogle();
    const retryRejection = assert.rejects(retry, /pas été confirmée/);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(pkceCalls, 3);
    fakeWindow.dispatchEvent(new CustomEvent('pratiqo:native-result', { detail: { id: posted[1].id, ok: false } }));
    await retryRejection;
    assert.equal(assigned.length, 1, 'native Google never navigates the WebView to Google');
    config.sandboxCheckoutEnabled = false;
    await assert.rejects(client.prepareNativeCheckout(), /pas disponible/);
    assert.equal(posted.length, 2, 'disabled checkout never reaches the browser');
  } finally {
    config.sandboxCheckoutEnabled = true;
    globalThis.fetch = originalFetch;
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (previousNavigator) Object.defineProperty(globalThis, 'navigator', previousNavigator);
    else Reflect.deleteProperty(globalThis, 'navigator');
  }
});

test('actual purchase handlers reject native requests before any service or database call', async () => {
  const denied = new Proxy({}, { get() { throw new Error('Service touched before native gate'); } });
  for (const path of [
    'app/api/stripe/checkout/route.ts', 'app/api/stripe/pro/checkout/route.ts',
    'app/api/group-sessions/checkout/route.ts',
    'app/api/planned-packages/pending-orders/[orderId]/checkout/route.ts',
    'app/api/stripe/connect/route.ts', 'app/api/stripe/identity/verify/route.ts',
  ]) {
    const handlers = loadModule(path, { '@/lib/mobile/server': server, '@/lib/stripe': { stripe: denied } });
    const response = await handlers.POST(new Request(`${origin}/api/test`, { method: 'POST', headers: { 'User-Agent': MOBILE_AGENT } })) as Response;
    assert.equal(response.status, 403, path);
  }
});

test('actual OAuth handler rejects disabled native callbacks before reading cookies or exchanging codes', async () => {
  let cookiesRead = false;
  const handlers = loadModule('app/auth/callback/route.ts', {
    '@/lib/mobile/server': server,
    'next/headers': { cookies: () => { cookiesRead = true; throw new Error('Unexpected cookie read'); } },
  });
  const response = await handlers.GET(new Request(`${origin}/auth/callback?native=1&native_state=8728ec16-d216-4a3a-8ca4-e5428a946c5a&code=synthetic123`)) as Response;
  assert.equal(response.status, 400);
  assert.equal(cookiesRead, false);
});
