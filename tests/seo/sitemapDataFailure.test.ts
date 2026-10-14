import assert from "node:assert/strict";
import test from "node:test";
import { emptySupplySitemap } from "./emptySupplySitemap";

test("a blog read failure rejects the sitemap rather than caching missing articles", async () => {
  await assert.rejects(emptySupplySitemap(async (input) => {
    const isBlog = String(input).includes("/blog_posts");
    return new Response(JSON.stringify(isBlog ? { message: "fixture unavailable" } : []), {
      status: isBlog ? 400 : 200, headers: { "content-type": "application/json" },
    });
  }), /sitemap_blog_data_unavailable/);

  const recovered = await emptySupplySitemap(async (input) => new Response(JSON.stringify(
    String(input).includes("/blog_posts")
      ? [{ slug: "real-published-article", published_at: "2026-10-01T00:00:00Z", updated_at: null }] : [],
  ), { headers: { "content-type": "application/json" } }));
  assert.ok(recovered.some(entry => entry.url === "https://www.pratiqo.ca/blog/real-published-article"));
});

test("teacher supply transport failure is not a successfully empty sitemap", async () => {
  await assert.rejects(emptySupplySitemap(async (input) => new Response(JSON.stringify(
    String(input).includes("/teachers") ? { message: "fixture unavailable" } : [],
  ), { status: String(input).includes("/teachers") ? 400 : 200,
    headers: { "content-type": "application/json" } })), /unavailable/);
});
