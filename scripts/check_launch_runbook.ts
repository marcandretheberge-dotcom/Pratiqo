import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const backupPath = "docs/PRODUCTION_BACKUPS_RUNBOOK.md";
const launchPath = "docs/PRODUCTION_LAUNCH_RUNBOOK.md";

assert.equal(existsSync(join(root, backupPath)), true, `${backupPath} must exist`);
assert.equal(existsSync(join(root, launchPath)), true, `${launchPath} must exist`);

const backup = read(backupPath);
const launch = read(launchPath);
const combined = `${backup}\n${launch}`;

const requiredEnvNames = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRO_MONTHLY_PRICE_ID",
  "STRIPE_CHECKOUT_BASE_URL",
  "APP_BASE_URL",
  "APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PRATIQO_COLLECT_SALES_TAX",
  "PRATIQO_TAX_MODE",
  "STRIPE_TAX_CODE_PRIVATE_LESSONS",
  "PRATIQO_TAX_BILLING_ADDRESS_COLLECTION",
  "GROUP_SESSIONS_CHECKOUT_ENABLED=false",
];

for (const name of requiredEnvNames) {
  assert.match(launch, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${name} missing`);
}

const requiredWebhookEvents = [
  "checkout.session.completed",
  "payment_intent.succeeded",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "account.updated",
  "transfer.failed",
  "charge.dispute.created",
  "identity.verification_session.verified",
  "identity.verification_session.requires_input",
  "identity.verification_session.canceled",
];

assert.match(launch, /https:\/\/www\.pratiqo\.ca\/api\/stripe\/webhook/);
for (const event of requiredWebhookEvents) {
  assert.match(launch, new RegExp(event.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${event} missing`);
}

assert.match(backup, /Restore Procedure/i);
assert.match(backup, /private/i);
assert.match(backup, /least-privilege|least privilege/i);
assert.match(launch, /Rollback Plan/i);
assert.match(launch, /Production Smoke Test/i);

const secretPatterns = [
  /\bsk_live_[A-Za-z0-9_]+/,
  /\bwhsec_[A-Za-z0-9_]+/,
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+/,
  /AWS_SECRET_ACCESS_KEY\s*=\s*\S+/,
  /STRIPE_SECRET_KEY\s*=\s*\S+/,
];

for (const pattern of secretPatterns) {
  assert.doesNotMatch(combined, pattern, `runbooks must not contain secret-looking values: ${pattern}`);
}

console.log("[ops:launch-runbook] OK");
