export const YO_ACCOUNT_PATH = "/yo/mon-parcours";
export type Product = "cafe" | "yo";

const navigationKeys = new Set([
  "lang", "language", "salon", "roomId", "from", "yoReturn", "yoExpression", "yoMission",
  "lecon", "activite", "city", "today", "title", "demo", "step", "unit", "lesson", "mission", "liveSlug",
]);

export function productHome(value: string | null): string | null {
  return value === "yo" || value === "cafe" ? "/" + value : null;
}

function parseProductUrl(value: unknown): URL | null {
  if (typeof value !== "string" || !value || value.length > 3000 || value.includes("\\") ||
      Array.from(value).some(c => c.charCodeAt(0) < 32)) return null;
  const path = value.split(/[?#]/, 1)[0].replace(/\/$/, "");
  const legacy = path === "/student/yopratiqo";
  if (!legacy && !/^\/(?:yo|cafe)(?:\/[a-zA-Z0-9_-]+)*$/.test(path)) return null;
  const url = new URL(value, "https://pratiqo.invalid");
  url.pathname = legacy ? YO_ACCOUNT_PATH : path;
  for (const key of [...url.searchParams.keys()]) {
    if (!navigationKeys.has(key)) url.searchParams.delete(key);
  }
  if (!/^#[\w-]+$/.test(url.hash)) url.hash = "";
  return url;
}

export function productReturnPath(value: unknown): string | null {
  const url = parseProductUrl(value);
  if (!url) return null;
  const back = url.searchParams.get("yoReturn");
  if (back !== null) {
    const course = parseProductUrl(back);
    if (!course || productForPath(course.pathname) !== "yo" || course.searchParams.has("yoReturn")) {
      url.searchParams.delete("yoReturn");
    } else {
      url.searchParams.set("yoReturn", course.pathname + course.search + course.hash);
    }
  }
  return url.pathname + url.search + url.hash;
}

export function productForPath(path: string): Product {
  return /^\/cafe(?:[/?#]|$)/.test(path) ? "cafe" : "yo";
}

export function productLoginHref(next: string): string {
  const target = productReturnPath(next);
  return target ? "/login?" + new URLSearchParams({ next: target }) : "/login";
}

/** The private Yo hub verifies learning consent before resuming a course. */
export function productArrivalPath(target: string): string {
  if (productForPath(target) === "cafe" || target.split(/[?#]/, 1)[0] === YO_ACCOUNT_PATH) return target;
  return YO_ACCOUNT_PATH + "?" + new URLSearchParams({ reprendre: target });
}
