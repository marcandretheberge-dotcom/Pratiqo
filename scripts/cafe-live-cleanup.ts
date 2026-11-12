import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const k = line.slice(0, i);
    const v = line.slice(i + 1);
    if (process.env[k] == null || process.env[k] === "") process.env[k] = v;
  }
}

loadEnvFile(".env.cafe-local");

void (async () => {
  const handoff = JSON.parse(readFileSync(".cafe-live-handoff.json", "utf8")) as {
    slug?: string;
    learnerId?: string;
    adminId?: string;
    supabaseUrl?: string;
  };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || handoff.supabaseUrl || "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
  const failures: string[] = [];
  const log: Array<{ action: string; ok: boolean; detail?: unknown }> = [];

  try {
    if (handoff.slug && handoff.adminId) {
      const cancelled = await admin.rpc("cafe_admin_cancel_server", {
        p_actor_id: handoff.adminId,
        p_slug: handoff.slug,
      });
      log.push({ action: "cancel_session", ok: !cancelled.error, detail: cancelled.error?.message ?? cancelled.data });
      if (cancelled.error) failures.push(cancelled.error.message);
    }
    if (handoff.learnerId) {
      const del = await admin.auth.admin.deleteUser(handoff.learnerId);
      log.push({ action: "delete_learner", ok: !del.error, detail: del.error?.message ?? null });
      if (del.error) failures.push(del.error.message);
    }
    if (handoff.adminId) {
      const del = await admin.auth.admin.deleteUser(handoff.adminId);
      log.push({ action: "delete_temp_admin", ok: !del.error, detail: del.error?.message ?? null });
      if (del.error) failures.push(del.error.message);
    }
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }

  if (failures.length) {
    console.error(JSON.stringify({ cleanupFailed: true, failures, log }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ cleanupFailed: false, log }, null, 2));
})();
