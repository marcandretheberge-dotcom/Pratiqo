import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

export function isGuidedStripeReturnOnlyChange(file: string, before: string, after: string): boolean {
  if (file !== "app/api/stripe/connect/route.ts") return false;
  const original = before.replace(/\r\n/g, "\n");
  const current = after.replace(/\r\n/g, "\n");
  const declaration = '    // Fixed internal destination only; never accept an arbitrary redirect URL.\n    const returnPath = new URL(req.url).searchParams.get("flow") === "teacher-setup"\n      ? "/teacher/setup-payments?setup=1&"\n      : "/onboarding?";\n';
  if (!current.includes(declaration)) return false;
  const restored = original.includes(declaration) ? current : current.replace(declaration, "")
    .replace('`${base}${returnPath}stripe=refresh`', '`${base}/onboarding?stripe=refresh`')
    .replace('`${base}${returnPath}stripe=success`', '`${base}/onboarding?stripe=success`');
  return restored === original;
}

export function hasOnlyGuidedStripeReturnChange(file: string): boolean {
  if (file !== "app/api/stripe/connect/route.ts") return false;
  try {
    const base = execFileSync("git", ["merge-base", "HEAD", "origin/main"], { encoding: "utf8" }).trim();
    return isGuidedStripeReturnOnlyChange(file,
      execFileSync("git", ["show", `${base}:${file}`], { encoding: "utf8" }), readFileSync(file, "utf8"));
  } catch { return false; }
}
