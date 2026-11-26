import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_AGENT, MOBILE_AUTH_RETURN, MOBILE_PAYMENT_RETURN, ReturnGate,
  httpsOrigin, isNativeAgent, navigationPolicy, prepareGoogleUrl, isSandboxCheckoutUrl,
} from '../../shared/mobileProtocol';
import { mobileConfig, nativeAuthReturn, nativePaymentReturn, nativeCheckoutContext,
  nativeCheckoutUrls, blockUnsupportedNativePurchase,
} from '../../lib/mobile/server';

const origin = 'https://mobile-test.example.com';
const authOrigin = 'https://synthetic.supabase.co';
const state = '8728ec16-d216-4a3a-8ca4-e5428a946c5a';
const other = '668c8d01-c3f2-439e-b547-31034460387a';
const env = { ENABLE_NATIVE_WRAPPER_BETA: 'true', NATIVE_WRAPPER_WEB_ORIGIN: origin,
  NEXT_PUBLIC_SUPABASE_URL: authOrigin, ENABLE_NATIVE_WRAPPER_CHECKOUT: 'true', STRIPE_SECRET_KEY: 'sk_test_synthetic' };
const callback = `${origin}/auth/callback?intent=student&next=%2Fprofile`;
function oauth() {
  const url = new URL(`${authOrigin}/auth/v1/authorize`);
  url.searchParams.set('provider', 'google');
  url.searchParams.set('code_challenge', 'a'.repeat(43));
  url.searchParams.set('code_challenge_method', 's256');
  url.searchParams.set('redirect_to', callback);
  return url;
}

test('explicit HTTPS origin, exact UA token, and fail-closed defaults', () => {
  assert.equal(httpsOrigin('https://user:pass@example.com'), null);
  assert.equal(httpsOrigin('http://localhost:3000'), null);
  assert.equal(httpsOrigin(`${origin}/path`), null);
  assert.equal(isNativeAgent(`Mozilla/5.0 ${MOBILE_AGENT}`), true);
  assert.equal(isNativeAgent(`fake${MOBILE_AGENT}`), false);
  assert.equal(mobileConfig({}).enabled, false);
  assert.equal(mobileConfig({ ...env, STRIPE_SECRET_KEY: 'sk_live_synthetic' }).sandboxCheckoutEnabled, false);
  assert.equal(mobileConfig({ ...env, ENABLE_NATIVE_WRAPPER_CHECKOUT: undefined }).sandboxCheckoutEnabled, false);
});

test('navigation keeps site inside, never executes arbitrary schemes or opens payment/auth links', () => {
  assert.equal(navigationPolicy(`${origin}/profile?tab=project`, origin), 'internal');
  assert.equal(navigationPolicy('https://example.org/resource', origin), 'external');
  assert.equal(navigationPolicy('mailto:support@example.com', origin), 'contact');
  for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,test', 'intent://x',
    `${origin}/%75pgrade`, `${origin}/yo/checkout`, `${origin}/api/stripe/checkout`,
    'https://checkout.stripe.com/c/pay/cs_test_abc', `${authOrigin}/auth/v1/authorize`,
    'https://accounts.google.com/o/oauth2/auth', 'https://user@example.com']) {
    assert.equal(navigationPolicy(url, origin), 'blocked', url);
  }
});

test('Google bridge preserves PKCE challenge, intent and original return without moving session tokens', () => {
  const original = oauth();
  const result = prepareGoogleUrl(original.toString(), mobileConfig(env), state);
  assert.equal(result.webCallback, callback);
  const browser = new URL(result.browserUrl);
  assert.equal(browser.searchParams.get('code_challenge'), original.searchParams.get('code_challenge'));
  const redirected = new URL(browser.searchParams.get('redirect_to')!);
  assert.equal(redirected.searchParams.get('native_state'), state);
  assert.equal(redirected.searchParams.get('intent'), 'student');
  assert.equal(redirected.searchParams.get('next'), '/profile');
  assert.equal(/access_token|refresh_token|code_verifier/.test(result.browserUrl), false);
});

test('Google bridge rejects different auth origin, insecure/missing PKCE and foreign callbacks', () => {
  for (const mutate of [
    (url: URL) => { url.hostname = 'attacker.supabase.co'; },
    (url: URL) => { url.searchParams.set('code_challenge_method', 'plain'); },
    (url: URL) => { url.searchParams.delete('code_challenge'); },
    (url: URL) => { url.searchParams.set('redirect_to', 'https://attacker.example/auth/callback'); },
    (url: URL) => { url.searchParams.set('redirect_to', `${callback}&native=1`); },
  ]) {
    const url = oauth(); mutate(url);
    assert.throws(() => prepareGoogleUrl(url.toString(), mobileConfig(env), state));
  }
});

test('ordinary web OAuth remains unchanged; native callback is private, fixed, and exchanges no session', () => {
  assert.equal(nativeAuthReturn(new URL(`${callback}&code=code123456789`), {}), null);
  assert.equal(nativeAuthReturn(new URL(`${callback}&native=1&native_state=${state}`), {})?.status, 400);
  const response = nativeAuthReturn(new URL(`${callback}&native=1&native_state=${state}&code=code123456789&redirect=https://attacker.example`), env)!;
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  const target = new URL(response.headers.get('Location')!);
  assert.equal(`${target.protocol}//${target.host}${target.pathname}`, MOBILE_AUTH_RETURN);
  assert.equal(target.searchParams.get('code'), 'code123456789');
  assert.equal(target.searchParams.has('redirect'), false);
  assert.equal(response.headers.has('Set-Cookie'), false);
});

test('auth return correlates, expires and consumes once before handing code to the original web callback', () => {
  const gate = new ReturnGate();
  gate.start({ kind: 'auth', state, webCallback: callback, expiresAt: 100 });
  assert.throws(() => gate.start({ kind: 'auth', state: other, expiresAt: 200 }));
  const raw = `${MOBILE_AUTH_RETURN}?state=${state}&code=code123456789`;
  const next = gate.consume(raw, origin, 50)!;
  assert.equal(new URL(next).searchParams.get('intent'), 'student');
  assert.equal(new URL(next).searchParams.get('code'), 'code123456789');
  assert.equal(gate.consume(raw, origin, 51), null);
  gate.start({ kind: 'auth', state, webCallback: callback, expiresAt: 100 });
  assert.equal(gate.consume(raw, origin, 100), null);
});

test('wrong state, host, scheme, callback kind, duplicate state, error, and cold starts never log in', () => {
  const raw = `${MOBILE_AUTH_RETURN}?state=${state}&code=code123456789`;
  for (const url of [raw.replace(state, other), raw.replace('://auth/', '://other/'), raw.replace('ca.pratiqo.app.beta:', 'https:'),
    raw.replace('://auth/callback', '://payment/return'), `${raw}&state=${state}`, `${raw}&error=denied`]) {
    const gate = new ReturnGate();
    gate.start({ kind: 'auth', state, webCallback: callback, expiresAt: 100 });
    assert.equal(gate.consume(url, origin, 50), null, url);
  }
  assert.equal(new ReturnGate().consume(raw, origin), null);
});

test('only sandbox checkout is accepted and native flags cannot authorize a purchase', () => {
  assert.equal(isSandboxCheckoutUrl('https://checkout.stripe.com/c/pay/cs_test_abc#secret'), true);
  assert.equal(isSandboxCheckoutUrl('https://checkout.stripe.com/c/pay/cs_live_abc'), false);
  const request = new Request(`${origin}/api/stripe/checkout`, {
    headers: { 'User-Agent': MOBILE_AGENT, 'X-Pratiqo-Native-State': state },
  });
  const context = nativeCheckoutContext(request, env);
  assert.deepEqual(context, { origin, state });
  assert.equal((nativeCheckoutContext(request, {}) as Response).status, 403);
  assert.equal((nativeCheckoutContext(request, { ...env, STRIPE_SECRET_KEY: 'sk_live_synthetic' }) as Response).status, 403);
  assert.equal(nativeCheckoutContext(new Request(`${origin}/api/stripe/checkout`), {}), null);
  assert.equal(blockUnsupportedNativePurchase(request)?.status, 403);
  assert.equal(blockUnsupportedNativePurchase(new Request(`${origin}/api/stripe/pro/checkout`)), null);
});

test('checkout placeholders stay literal and returned session goes only to server-verified success page', () => {
  const urls = nativeCheckoutUrls({ origin, state });
  assert.ok(urls.success.includes('{CHECKOUT_SESSION_ID}'));
  const response = nativePaymentReturn(new URL(urls.success.replace('{CHECKOUT_SESSION_ID}', 'cs_test_synthetic')), env);
  assert.equal(response.status, 302);
  const gate = new ReturnGate();
  gate.start({ kind: 'payment', state, expiresAt: 100 });
  assert.equal(gate.consume(response.headers.get('Location')!, origin, 50), `${origin}/booking/success?session_id=cs_test_synthetic`);
  gate.start({ kind: 'payment', state, expiresAt: 100 });
  assert.equal(gate.consume(`${MOBILE_PAYMENT_RETURN}?state=${state}&cancelled=1`, origin, 50), null);
  assert.equal(nativePaymentReturn(new URL(urls.success.replace('{CHECKOUT_SESSION_ID}', 'cs_live_synthetic')), env).status, 400);
});
