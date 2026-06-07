import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type TestFn = () => void;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const root = process.cwd();
const backupPath = "docs/PRODUCTION_BACKUPS_RUNBOOK.md";
const launchPath = "docs/PRODUCTION_LAUNCH_RUNBOOK.md";

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

function changedFiles(): string[] {
  const files = new Set<string>();
  for (const args of [
    ["diff", "--name-only", "HEAD"],
    ["diff", "--cached", "--name-only"],
  ]) {
    execFileSync("git", args, { cwd: root, encoding: "utf8" })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((file) => files.add(file));
  }
  execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .forEach((line) => files.add(line.slice(3).trim()));
  return [...files].sort();
}

const webhookEvents = [
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

test("production backup and launch runbooks exist", () => {
  assert.equal(existsSync(join(root, backupPath)), true);
  assert.equal(existsSync(join(root, launchPath)), true);
});

test("launch runbook includes Stripe webhook endpoint and required events", () => {
  const launch = read(launchPath);
  assert.match(launch, /https:\/\/www\.pratiqo\.ca\/api\/stripe\/webhook/);
  for (const event of webhookEvents) {
    assert.match(launch, new RegExp(event.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("launch runbook includes Vercel env checklist and launch gates", () => {
  const launch = read(launchPath);
  for (const name of [
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
  ]) {
    assert.match(launch, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(launch, /GROUP_SESSIONS_CHECKOUT_ENABLED=false/);
});

test("backup runbook includes restore procedure and private-storage/security notes", () => {
  const backup = read(backupPath);
  assert.match(backup, /Restore Procedure/i);
  assert.match(backup, /staging/i);
  assert.match(backup, /private backup/i);
  assert.match(backup, /least-privilege|least privilege/i);
  assert.match(backup, /Never commit secrets/i);
});

test("launch runbook includes smoke test, rollback, incidents, and monitoring", () => {
  const launch = read(launchPath);
  assert.match(launch, /Production Smoke Test/i);
  assert.match(launch, /cancellation\/refund path/i);
  assert.match(launch, /Membre Pro checkout/i);
  assert.match(launch, /YoPratiqo paid checkout remains unavailable/i);
  assert.match(launch, /Rollback Plan/i);
  assert.match(launch, /Incident Checklist/i);
  assert.match(launch, /Post-Launch Monitoring/i);
});

test("runbooks and checks do not contain secret-looking live values", () => {
  const combined = [
    read(backupPath),
    read(launchPath),
    read("scripts/check_launch_runbook.ts"),
  ].join("\n");

  for (const pattern of [
    /\bsk_live_[A-Za-z0-9_]+/,
    /\bwhsec_[A-Za-z0-9_]+/,
    /SUPABASE_SERVICE_ROLE_KEY\s*=\s*\S+/,
    /AWS_SECRET_ACCESS_KEY\s*=\s*\S+/,
    /STRIPE_SECRET_KEY\s*=\s*\S+/,
  ]) {
    assert.doesNotMatch(combined, pattern);
  }
});

test("ops runbook branch does not touch restricted systems", () => {
  const allowed = new Set([
    "docs/PRODUCTION_BACKUPS_RUNBOOK.md",
    "docs/PRODUCTION_LAUNCH_RUNBOOK.md",
    "scripts/check_launch_runbook.ts",
    "tests/ops/productionRunbooks.test.ts",
    "package.json",
  ]);

  const ignoredUntracked = new Set([
    "Untitled",
    "docs/LAUNCH_READINESS_ANALYSIS.md",
    "pratiqo-legal-export-20260528-2221.zip",
  ]);

  for (const file of changedFiles()) {
    if (ignoredUntracked.has(file)) continue;
    assert.ok(allowed.has(file), `unexpected file touched: ${file}`);
  }
});

let passed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
    break;
  }
}

if (process.exitCode !== 1) {
  console.log(`[ops:productionRunbooks] ${passed} tests passed`);
}
