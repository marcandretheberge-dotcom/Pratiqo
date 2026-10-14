import assert from "node:assert/strict";
import { t } from "../../lib/translations";
import { teacherBookingActionKey, type TeacherBookingAction } from "../../lib/teachers/bookingCapability";

const origin = process.env.SEO_TEST_BASE_URL ?? "http://127.0.0.1:3190";
const clean = (text: string) => text.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
async function get(path: string, locale = "fr") {
  const response = await fetch(`${origin}${path}`, { headers: { "user-agent": "Googlebot", cookie: `pratiqo-locale=${locale}` }, redirect: "manual" });
  return { response, html: await response.text() };
}

async function main() {
  const { html: sitemap } = await get("/sitemap.xml");
  const profiles = [...sitemap.matchAll(/<loc>https:\/\/www\.pratiqo\.ca(\/professeurs\/[^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.ok(profiles.length, "live inventory required for this integration check");
  for (const path of profiles) {
    for (const locale of ["fr", "en", "es"]) {
      const { response, html } = await get(`${path}?utm_source=seo_qa`, locale);
      assert.equal(response.status, 200, path);
      const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
      const actions = [...visible.matchAll(/data-booking-action="([^"]+)"/g)].map(match => match[1]);
      assert.equal(actions.length, 2, "desktop and mobile action exist in SSR");
      assert.equal(actions[0], actions[1]);
      assert.ok(["book", "request", "contact", "waitlist"].includes(actions[0]), `${path}: capability resolved`);
      assert.ok(clean(visible).includes(t(teacherBookingActionKey(actions[0] as TeacherBookingAction), locale as "fr" | "en" | "es")));
      assert.equal([...visible.matchAll(/<h1\b/gi)].length, 1, path);
      assert.ok(clean(visible).includes(t("aboutSection", locale)), `${path}: profile labels must use the request locale in SSR`);
      assert.ok(html.includes(`href="https://www.pratiqo.ca${path}"`));
      assert.ok(html.includes(`lang="${locale}"`));
      assert.doesNotMatch(html, /rel="alternate"[^>]+hrefLang=/, "cookie locales are not independently addressable hreflang URLs");
      const title = clean(html.match(/<title>([^<]*)/i)?.[1] ?? "");
      assert.equal(title.split("Pratiqo").length - 1, 1);
      const graph = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
        .map((match) => JSON.parse(match[1])).find((schema) => schema["@graph"]);
      const person = graph?.["@graph"]?.find((entry: { "@type": string }) => entry["@type"] === "ProfilePage")?.mainEntity;
      assert.ok(person?.name);
      assert.doesNotMatch(JSON.stringify(graph), /AggregateRating|Review|streetAddress|telephone/);
      // The bio renderer turns leading Markdown bullets into list markup.
      if (person.description) assert.ok(clean(visible).includes(clean(person.description).replace(/^[-*#\s]+/, "").slice(0, 60)), `${path}: biography must exist outside RSC scripts`);
      console.log(JSON.stringify({ path, locale, status: response.status, title, action: actions[0], biographyInHtml: Boolean(person.description) }));
    }
  }
  for (const city of ["saint-georges", "levis", "quebec"]) {
    const path = `/tuteurs/${city}`;
    const { response, html } = await get(path);
    assert.equal(response.status, 200);
    const noindex = html.includes('name="robots" content="noindex, follow"');
    assert.equal(sitemap.includes(`<loc>https://www.pratiqo.ca${path}</loc>`), !noindex);
    console.log(JSON.stringify({ path, status: response.status, noindex, inSitemap: !noindex }));
  }
  for (const path of ["/cours/francais/saint-georges", "/cours/piano/saint-georges", "/cours/anglais/quebec"]) {
    const { response, html } = await get(path);
    assert.equal(response.status, 200);
    const noindex = html.includes('name="robots" content="noindex, follow"');
    assert.equal(sitemap.includes(`<loc>https://www.pratiqo.ca${path}</loc>`), !noindex);
    console.log(JSON.stringify({ path, status: response.status, noindex, inSitemap: !noindex }));
  }
  for (const path of ["/cours/not-a-subject/saint-georges", "/tuteurs/not-a-city"]) {
    const { response } = await get(path);
    assert.equal(response.status, 404);
    console.log(JSON.stringify({ path, status: response.status }));
  }
  for (const [path, target] of [["/fr/cours/francais/saint-georges?utm_source=qa", "/cours/francais/saint-georges"], ["/tuteurs-prive/saint-georges?utm_source=qa", "/tuteurs/saint-georges"]]) {
    const { response } = await get(path);
    assert.equal(response.status, 308);
    const location = new URL(response.headers.get("location")!, origin);
    assert.equal(location.pathname, target);
    assert.equal(location.searchParams.get("utm_source"), "qa");
    console.log(JSON.stringify({ path, status: response.status, destination: location.pathname + location.search }));
  }
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  console.log(JSON.stringify({ sitemap: { total: urls.length, profiles: profiles.length, city: urls.filter(url => url.includes("/tuteurs/")).length, courseCity: urls.filter(url => /\/cours\/[^/]+\/[^/]+$/.test(url)).length } }));
  const { html: french } = await get("/cours/francais/saint-georges");
  assert.doesNotMatch(french, /DALF|30 \$ à 80/);
  assert.match(french, /Quel est le tarif des cours à Saint-Georges/);
  for (const locale of ["fr", "en", "es"]) {
    const { html } = await get("/", locale);
    const title = clean(html.match(/<title>([^<]*)/i)?.[1] ?? "");
    const h1 = clean(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
    assert.ok(h1 && title.includes(h1), "homepage metadata and server heading use the same locale");
  }
  console.log(JSON.stringify({ result: "PASS", checks: "server-rendered profile content, locale metadata, canonical, structured data and priority-city policy" }));
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
