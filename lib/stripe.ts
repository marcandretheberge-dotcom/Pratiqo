import Stripe from "stripe";

let _client: Stripe | undefined;

function client(): Stripe {
  if (!_client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Missing STRIPE_SECRET_KEY environment variable");
    _client = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  }
  return _client;
}

// Lazy proxy: the Stripe client is created on first property access (request time),
// not at module evaluation time, so builds without STRIPE_SECRET_KEY in env succeed.
export const stripe = new Proxy({} as unknown as Stripe, {
  get(_target, prop: string | symbol) {
    return Reflect.get(client(), prop);
  },
});
