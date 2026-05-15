import { expect, test } from "@playwright/test";

/**
 * Protected route smoke tests.
 *
 * These checks intentionally use a guest browser context. They verify that
 * protected app routes redirect before rendering private surfaces. Role-specific
 * authenticated coverage belongs in the gated journey specs once E2E auth
 * secrets are available.
 */

const PROTECTED_ROUTES = [
  "/student/search",
  "/teacher/verification",
  "/teacher/my-profile",
  "/profile",
  "/loyalty",
  "/loyalty/rapport",
  "/admin/operations",
] as const;

for (const route of PROTECTED_ROUTES) {
  test(`guest visiting ${route} is redirected to login`, async ({ page }) => {
    const response = await page.goto(route);

    await expect(page).toHaveURL(/\/login(\?|$)/);
    expect(response?.status(), `final response for ${route}`).toBeLessThan(400);
  });
}
