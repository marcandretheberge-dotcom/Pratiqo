import { test, expect } from "@playwright/test";

/**
 * Smoke checks for the read-only edge API routes promoted in step p1-7.
 * If any of these regress to a 5xx, the whole marketplace UI breaks — guard
 * them on every PR.
 */

test("/api/geo returns a country + locale payload", async ({ request }) => {
  const res = await request.get("/api/geo?country=CA");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toMatchObject({
    country: "CA",
    locale: "fr",
    currency: "CAD",
  });
});

test("/api/geo handles missing country gracefully", async ({ request }) => {
  const res = await request.get("/api/geo");
  expect(res.status()).toBe(200);
  // No country header in local CI — payload should be {country:null, locale:null}.
  const body = (await res.json()) as Record<string, unknown>;
  expect(body).toHaveProperty("country");
});

test("/api/teachers/plans tolerates empty id list", async ({ request }) => {
  const res = await request.get("/api/teachers/plans?ids=");
  expect(res.status()).toBeLessThan(500);
});
