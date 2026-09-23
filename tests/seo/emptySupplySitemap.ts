import "next/dist/server/node-environment";
import sitemap from "../../app/sitemap";

/** Exercise sitemap composition without a live database or secret credentials. */
export async function emptySupplySitemap(
  fetchImplementation: typeof fetch = async () => new Response("[]", { headers: { "content-type": "application/json" } }),
) {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://seo-fixture.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "seo-test-fixture";
  globalThis.fetch = fetchImplementation;
  try {
    return await sitemap();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
}
