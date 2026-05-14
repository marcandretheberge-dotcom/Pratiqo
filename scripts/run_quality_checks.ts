import { spawnSync } from "node:child_process";

const checks = ["repo:hygiene", "db:safety", "payment:safety", "test:payments", "validate:i18n", "typecheck", "build"];

for (const check of checks) {
  const result =
    process.platform === "win32"
      ? spawnSync("cmd.exe", ["/d", "/s", "/c", `npm.cmd run ${check}`], {
          stdio: "inherit",
          shell: false,
        })
      : spawnSync("npm", ["run", check], {
          stdio: "inherit",
          shell: false,
        });

  if (result.error) {
    console.error(`[quality] Failed to start "${check}": ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
