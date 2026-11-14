/**
 * Probe HTTP headers served by next start for café room vs site routes.
 * Simulated proof of header wiring — not a Daily API or browser join validation.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const base = (process.env.CAFE_PR3B_BASE || "http://127.0.0.1:3466").replace(/\/$/, "");

async function probe(path: string) {
  const res = await fetch(`${base}${path}`, { redirect: "manual" });
  const permissions = res.headers.get("permissions-policy") || res.headers.get("Permissions-Policy");
  const csp = res.headers.get("content-security-policy") || "";
  return {
    path,
    status: res.status,
    permissionsPolicy: permissions,
    cspHasDaily: /daily\.co/i.test(csp),
    displayCaptureDenied: Boolean(permissions && /display-capture=\(\)/.test(permissions)),
  };
}

void (async () => {
  const room = await probe("/cafe/preview/salle");
  const site = await probe("/");
  const report = {
    kind: "header_probe_simulated_http",
    notDailyApiValidation: true,
    notBrowserJoinValidation: true,
    base,
    room,
    site,
    assertions: {
      roomDelegatesOrSelfCamera: Boolean(
        room.permissionsPolicy
        && (/camera=\(self/.test(room.permissionsPolicy)),
      ),
      siteDeniesCamera: Boolean(site.permissionsPolicy && /camera=\(\)/.test(site.permissionsPolicy)),
      screenShareOffOnRoom: room.displayCaptureDenied,
    },
  };
  const outDir = join("artifacts", "cafe-pr3b-room");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "header-probe.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  const ok =
    report.assertions.roomDelegatesOrSelfCamera
    && report.assertions.siteDeniesCamera
    && report.assertions.screenShareOffOnRoom;
  if (!ok) process.exitCode = 2;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
