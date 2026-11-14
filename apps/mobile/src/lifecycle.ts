export type NativeAppState = "active" | "background" | "inactive";

/** Publish visibility only to the configured app page, including a final race check. */
export function nativeAppStateScript(
  page: string,
  origin: string | null,
  state: string | null | undefined,
): string | null {
  if (!origin) return null;
  try {
    const url = new URL(page);
    if (url.protocol !== "https:" || url.origin !== origin || url.username || url.password) return null;
  } catch {
    return null;
  }
  const nextState: NativeAppState = state === "active" || state === "inactive" ? state : "background";
  return `
    (function () {
      if (window.location.origin !== ${JSON.stringify(origin)}) return;
      window.__PRATIQO_APP_STATE__ = ${JSON.stringify(nextState)};
      window.dispatchEvent(new Event("pratiqo:app-state"));
    })();
    true;
  `;
}
