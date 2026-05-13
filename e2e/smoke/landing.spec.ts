import { test, expect } from "@playwright/test";

/**
 * Marketing landing smoke tests.
 * Confirms the public homepage renders end-to-end for each promoted locale
 * and that the global currency / language switchers are reachable from the
 * header. These run on every PR — they touch no auth state and write nothing.
 */

const LOCALES: Array<{ code: "fr" | "en" | "es"; langRoot: string }> = [
  { code: "fr", langRoot: "fr" },
  { code: "en", langRoot: "en" },
  { code: "es", langRoot: "es" },
];

for (const { code, langRoot } of LOCALES) {
  test(`landing /${code} renders with correct <html lang> and header`, async ({ page }) => {
    const response = await page.goto(`/${code}`);
    expect(response?.status(), `GET /${code} should return 2xx`).toBeLessThan(400);

    // `LocaleHtmlSync` rewrites the lang attr to a region-tagged variant
    // post-hydration (e.g. "en-CA", "es-UY"). Accept both forms.
    const langRegex = new RegExp(`^${langRoot}(-|$)`, "i");
    await expect(page.locator("html")).toHaveAttribute("lang", langRegex);

    // Header must expose the Pratiqo wordmark + language + currency controls.
    // Use exact aria-label matches to avoid colliding with the "Languages"
    // category chip rendered on the English landing.
    await expect(page.getByRole("link", { name: /pratiqo/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Currency", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Language", exact: true })).toBeVisible();
  });
}

test("currency switcher round-trips through the promoted list", async ({ page }) => {
  await page.goto("/fr");

  const trigger = page.getByRole("button", { name: "Currency", exact: true });
  await trigger.click();

  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();

  for (const code of ["USD", "EUR", "MXN", "CAD"] as const) {
    await expect(listbox.getByRole("option", { name: new RegExp(code) })).toBeVisible();
  }

  await listbox.getByRole("option", { name: /USD/ }).click();
  await expect(trigger).toContainText(/USD/);
});

test.skip("hreflang alternates declare en/fr/es siblings", async () => {
  // p1-1 introduced locale-prefixed routing but did not yet add
  // `<link rel="alternate" hreflang="...">` siblings to the SSR head.
  // Tracked as a follow-up: extend `lib/seo/alternates.ts` to emit hreflang
  // entries on every locale-prefixed route. Re-enable this test once shipped.
});
