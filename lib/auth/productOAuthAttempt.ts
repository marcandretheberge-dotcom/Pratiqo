import { productForPath, productHome, productReturnPath } from "./productReturn";

const STORAGE_KEY = "pratiqo_product_sign_in";
const LIFETIME = 15 * 60_000;

type ProductAttempt = { next: string; ref?: string; expires: number; id: string };

export function clearProductAttempt(): void {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* Storage may be unavailable. */ }
}

export function rememberProductAttempt(next: string, ref?: string): string | null {
  try {
    const attempt: ProductAttempt = { next, ref, expires: Date.now() + LIFETIME, id: crypto.randomUUID() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
    return attempt.id;
  } catch { return null; }
}

/** A provider may return only a code. Recover the originating tab before choosing any role. */
export function resumeOAuthCallback(fragment: URLSearchParams, marketplaceIntent: string | null): string {
  const callback = new URLSearchParams({ resumed: "1" });
  const code = fragment.get("ticket");
  if (code) callback.set("code", code);
  const home = productHome(fragment.get("product"));
  let next = home;
  let ref = fragment.get("ref");
  try {
    const saved: ProductAttempt | null = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
    const target = productReturnPath(saved?.next);
    const id = fragment.get("attempt");
    if (target && !home && !id) next = productHome(productForPath(target));
    if (saved && target && saved.expires > Date.now() && (!id || saved.id === id) && (!home || home === "/" + productForPath(target))) {
      next = target;
      ref = saved.ref ?? ref;
      clearProductAttempt();
    }
  } catch { /* The product home remains available on another device. */ }
  if (next) callback.set("next", next);
  else if (marketplaceIntent === "teacher" || marketplaceIntent === "learner") callback.set("intent", marketplaceIntent);
  if (ref) callback.set("ref", ref);
  return "/auth/callback?" + callback;
}
