import { execFileSync } from "node:child_process";

// Task policies, not permanent restrictions on unrelated branches.
export const YO_TASK_SCOPES = {
  "flashcards-printables": [
    /^app\/api\//, /^supabase\//, /^content\/legal\//, /^app\/\(app\)\/legal\//,
    /^app\/\(app\)\/booking\//, /^app\/\(app\)\/upgrade\//, /^lib\/payments\//,
    /^lib\/config\/membrePro/, /^lib\/commissions\//, /^lib\/seo\//, /^scripts\//,
    /^public\/audio\//, /\.(?:mp3|wav|m4a)$/,
  ],
  "intro-deck": [
    /^app\/api\/stripe\//, /^app\/api\/.*checkout/i, /^app\/api\/.*payment/i,
    /^lib\/payments\//, /^lib\/pricing\//, /^lib\/config\/membrePro\.ts$/,
    /^lib\/commissions\//, /^supabase\//, /^content\/legal\//,
    /^app\/\(app\)\/legal\//, /^public\/.*\.(?:mp3|wav|m4a)$/i,
    /^public\/audio\//, /^scripts\/(?:generate-yopratiqo-audio|.*openai)/i,
    /^app\/sitemap\.ts$/, /^app\/robots\.ts$/, /^lib\/seo\//,
  ],
} satisfies Record<string, RegExp[]>;

export type YoTaskScope = keyof typeof YO_TASK_SCOPES;

export function assertYoTaskScope(scope: YoTaskScope, files: readonly string[]): void {
  const forbidden = files.filter((file) =>
    YO_TASK_SCOPES[scope].some((pattern) => pattern.test(file.replace(/\\/g, "/"))),
  );
  if (forbidden.length) throw new Error(`Outside ${scope} task scope: ${forbidden.join(", ")}`);
}

export function readYoTaskComparison(base: string, head: string, cwd = process.cwd()) {
  const git = (...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8" });
  const resolveCommit = (ref: string) => {
    if (!ref || ref.startsWith("-")) throw new Error("An explicit Git reference is required");
    return git("rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`).trim();
  };
  const baseSha = resolveCommit(base);
  const headSha = head === "WORKTREE" ? "WORKTREE" : resolveCommit(head);
  // No rename detection: both old and new paths are checked, including deletions.
  const changed = git("diff", "--name-only", "--no-renames", "-z", baseSha,
    ...(headSha === "WORKTREE" ? [] : [headSha]), "--");
  const untracked = headSha === "WORKTREE" ? git("ls-files", "--others", "--exclude-standard", "-z") : "";
  return { baseSha, headSha, files: [...new Set((changed + untracked).split("\0").filter(Boolean))].sort() };
}
