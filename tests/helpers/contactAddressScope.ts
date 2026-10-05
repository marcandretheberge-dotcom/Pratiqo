import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

export function isBookingContactOnlyChange(file: string, before: string, after: string): boolean {
  return file === "app/(app)/booking/success/page.tsx" &&
    before.includes("support@pratiqo.ca") &&
    after.replace(/\r\n/g, "\n") === before.replace(/\r\n/g, "\n").replaceAll("support@pratiqo.ca", "info@pratiqo.ca");
}

export function hasOnlyBookingContactChange(file: string): boolean {
  if (file !== "app/(app)/booking/success/page.tsx") return false;
  const base = execFileSync("git", ["merge-base", "HEAD", "origin/main"], { encoding: "utf8" }).trim();
  const before = execFileSync("git", ["show", `${base}:${file}`], { encoding: "utf8" });
  return isBookingContactOnlyChange(file, before, readFileSync(file, "utf8"));
}

export function hasOnlyPublicContactChange(file: string): boolean {
  const allowed = new Set([
    "app/(app)/legal/annulation/page.tsx",
    "app/(app)/booking/success/page.tsx",
    "app/api/teacher/location/verify/route.ts",
    "lib/config/membrePro.ts",
  ]);
  const legalCopy = /^content\/legal\/(?:accessibilite|code-de-conduite|conditions-professeurs|confidentialite|membre-pro|paiements-remboursements|terms|yo-refund)\.(?:fr|en|es)\.md$/;
  if (!allowed.has(file) && !legalCopy.test(file)) return false;
  const base = execFileSync("git", ["merge-base", "HEAD", "origin/main"], { encoding: "utf8" }).trim();
  const before = execFileSync("git", ["show", `${base}:${file}`], { encoding: "utf8" }).replace(/\r\n/g, "\n");
  if (!before.includes("support@pratiqo.ca")) return false;
  let expected = before.replaceAll("support@pratiqo.ca", "info@pratiqo.ca");
  // Preserve Markdown hard breaks using the equivalent whitespace-free syntax.
  if (file.endsWith(".md")) expected = expected.replace(/([^\n]*info@pratiqo\.ca[^\n]*?) {2,}(\n)/g, "$1\\$2");
  return readFileSync(file, "utf8").replace(/\r\n/g, "\n") === expected;
}
