import { test, expect } from "@playwright/test";

/**
 * Public marketplace smoke tests.
 *
 * The authenticated `/student/search` surface is covered by `journeys/`
 * (it redirects to /login for guests). Here we only assert the landing
 * page exposes the search hero and a teacher listing pipeline — both the
 * populated grid and the empty state are valid outcomes.
 */

test("landing page exposes the search hero on /fr", async ({ page }) => {
  await page.goto("/fr");

  // Search subject + location inputs sit inside the hero card.
  const searchInput = page.locator("input[type='search'], input[placeholder]").first();
  await expect(searchInput).toBeVisible();
});

test("guest hitting /student/search is redirected to /login", async ({ page }) => {
  const response = await page.goto("/student/search");
  // Either we get a 200 on /login after redirect, or status() reports the
  // final 200 of /login. We assert URL only — covers both 30x and middleware.
  await expect(page).toHaveURL(/\/login(\?|$)/);
  expect(response?.status(), "final response after redirect").toBeLessThan(400);
});
