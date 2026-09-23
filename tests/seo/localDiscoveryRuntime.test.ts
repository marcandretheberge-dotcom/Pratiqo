/** Run against `npm run build` + `npm run start -- --port 3117`. */
import assert from "node:assert/strict";

const origin = process.env.SEO_TEST_BASE_URL ?? "http://localhost:3117";
async function request(path: string, userAgent = "Googlebot") {
  return fetch(`${origin}${path}`, {
    redirect: "manual", headers: { "user-agent": userAgent }, signal: AbortSignal.timeout(30000),
  });
}

async function main() {
  const sitemapResponse = await request("/sitemap.xml");
  assert.equal(sitemapResponse.status, 200);
  const sitemap = await sitemapResponse.text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const localUrls = urls.filter((url) => /^https:\/\/www\.pratiqo\.ca\/cours\/[^/]+\/[^/]+$/.test(url));
  assert.ok(urls.length > 0);
  assert.ok(!urls.some((url) => /\/(?:admin|api|login|connexion|student|teacher|checkout|messages|onboarding|dashboard)(?:\/|$)/.test(new URL(url).pathname)));
  assert.ok(!urls.some((url) => /\/(?:fr|en|es)\/cours\/|\/tuteurs-prive\//.test(url)));
  const paths = new Set([
    "/cours/francais/saint-georges", "/cours/espagnol/la-pocatiere",
    "/cours/francisation/riviere-du-loup", "/cours/francais/beauceville",
    "/cours/anglais/trois-rivieres", "/cours/francais/beloeil", "/tuteurs/saint-georges",
    ...localUrls.map((url) => new URL(url).pathname),
  ]);
  const report = [];
  for (const path of paths) {
    const response = await request(path);
    const html = await response.text();
    assert.equal(response.status, 200, path);
    assert.ok(!/Functions cannot be passed|<template[^>]+data-dgst="(?!BAILOUT_TO_CLIENT_SIDE_RENDERING)[^"]+"/.test(html), `${path}: server render error`);
    const canonicals = [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"[^>]*>/g)];
    assert.equal(canonicals.length, 1, path);
    assert.equal(canonicals[0][1], `https://www.pratiqo.ca${path}`);
    const robots = html.match(/<meta\b[^>]*name="robots"[^>]*content="([^"]+)"/i)?.[1];
    assert.ok(robots, path);
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.match(html, /name="description" content="[^"]+"/);
    assert.match(html, /<h1\b/);
    if (path.startsWith("/cours/")) {
      assert.equal(!robots.includes("noindex"), urls.includes(canonicals[0][1]), path);
    }
    report.push({ path, status: response.status, robots, canonical: canonicals[0][1] });
  }
  for (const path of ["/cours/unknown/saint-georges", "/cours/francais/unknown", "/tuteurs/unknown", "/tuteurs-prive/unknown"]) {
    for (const agent of ["Googlebot", "Mozilla/5.0"]) {
      const response = await request(path, agent);
      await response.text();
      assert.equal(response.status, 404, `${path} (${agent})`);
    }
    report.push({ path, status: 404 });
  }
  for (const [source, target] of [
    ["/fr/cours/francais/saint-georges", "/cours/francais/saint-georges"],
    ["/tuteurs-prive/saint-georges", "/tuteurs/saint-georges"],
  ]) {
    const response = await request(`${source}?utm_source=regression`);
    assert.equal(response.status, 308);
    assert.equal(response.headers.get("location"), `https://www.pratiqo.ca${target}?utm_source=regression`);
    report.push({ path: source, status: 308 });
  }
  const robotsResponse = await request("/robots.txt");
  assert.equal(robotsResponse.status, 200);
  assert.match(await robotsResponse.text(), /Sitemap: https:\/\/www\.pratiqo\.ca\/sitemap.xml/);
  console.log(JSON.stringify({ sitemapUrls: urls.length, courseCityUrls: localUrls.length, robotsStatus: 200, routes: report }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
