import Stripe from "stripe";

/** Pinned to the Stripe Node SDK bundled API version (see `stripe` package `apiVersion.js`). */
const API_VERSION = "2026-03-25.dahlia" as const;

const secretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = new Stripe(secretKey ?? "", {
  apiVersion: API_VERSION,
});
