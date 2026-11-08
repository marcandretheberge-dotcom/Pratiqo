import { existsSync } from "node:fs";
import { findIntroCourse } from "../../lib/yo/shared/course";

/** Resolve the actual bounded shared route, not an arbitrary dynamic-path wildcard. */
export function catalogRouteExists(path: string): boolean {
  const match = /^\/yo\/langues\/([^/]+)\/demarrer$/.exec(path);
  if (match) return Boolean(findIntroCourse(match[1])) && existsSync("app/yo/langues/[language]/demarrer/page.tsx");
  return existsSync(`app${path}/page.tsx`);
}
