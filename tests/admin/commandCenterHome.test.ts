/**
 * Admin marketplace command-center homepage + overview API contracts.
 *
 * Pins:
 *   - /admin layout still requires server-side admin role
 *   - overview API uses requireAdminApi (non-admins blocked)
 *   - overview payload is count-only (no private address/student detail)
 *   - homepage renders command-center modules + KPI/alert shells
 *   - promotions/payments are navigation-only (no Stripe/promo creation)
 *   - SEO module copy references Canada launched / Uruguay next without
 *     changing market rules
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ADMIN_COMMAND_CENTER_MODULES,
  ADMIN_OVERVIEW_FORBIDDEN_KEYS,
  ADMIN_OVERVIEW_UNAVAILABLE_LABEL,
  assertAdminOverviewPrivacySafe,
  buildAdminPriorityAlerts,
  emptyAdminOverview,
  formatAdminOverviewMetric,
  loadAdminOverview,
} from "@/lib/admin/overview";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

test("admin layout still requires requireAdminPage server-side", () => {
  const layout = read("app/(app)/admin/layout.tsx");
  assert.match(layout, /requireAdminPage\(/);
  assert.match(layout, /from\s+"@\/lib\/auth\/admin"/);
});

test("overview API exists and requires requireAdminApi", () => {
  const routePath = "app/api/admin/overview/route.ts";
  assert.ok(existsSync(join(ROOT, routePath)), "missing overview route");
  const route = read(routePath);
  assert.match(route, /requireAdminApi\(/);
  assert.match(route, /loadAdminOverview\(/);
  assert.match(route, /export async function GET/);
  assert.doesNotMatch(route, /stripe\.|checkout|PaymentIntent|webhook/i);
});

test("overview API does not expose private address or student-sensitive keys", () => {
  const route = read("app/api/admin/overview/route.ts");
  const lib = read("lib/admin/overview.ts");
  for (const forbidden of [
    "home_address",
    "exact_address",
    "postal_code",
    "street",
    "phone",
    "student_email",
    "SERVICE_ROLE",
  ]) {
    assert.doesNotMatch(route, new RegExp(forbidden, "i"), `route leaked ${forbidden}`);
  }
  assert.match(lib, /ADMIN_OVERVIEW_FORBIDDEN_KEYS/);
  assert.ok(ADMIN_OVERVIEW_FORBIDDEN_KEYS.includes("address"));
  assert.ok(ADMIN_OVERVIEW_FORBIDDEN_KEYS.includes("email"));
  assert.throws(() => assertAdminOverviewPrivacySafe({ address: "secret" }));
  assert.doesNotThrow(() => assertAdminOverviewPrivacySafe(emptyAdminOverview()));
});

test("admin homepage renders marketplace command center modules", () => {
  const page = read("app/(app)/admin/page.tsx");
  const overview = read("lib/admin/overview.ts");
  assert.match(page, /Centre de contrôle Pratiqo/);
  assert.match(page, /Espace admin/);
  assert.match(page, /ADMIN_COMMAND_CENTER_MODULES/);
  assert.match(page, /data-admin-module/);
  assert.match(overview, /href:\s*"\/admin\/users"/);
  assert.match(overview, /href:\s*"\/admin\/credentials"/);
  assert.match(page, /logout|signOut|LogOut/i);

  const ids = ADMIN_COMMAND_CENTER_MODULES.map((m) => m.id);
  assert.deepEqual(ids, [
    "teachers",
    "students",
    "verifications",
    "bookings",
    "payments",
    "promotions",
    "seo",
    "support",
  ]);
});

test("admin homepage shows real or unavailable KPI states", () => {
  const page = read("app/(app)/admin/page.tsx");
  assert.match(page, /formatAdminOverviewMetric/);
  assert.match(page, /data-admin-kpi/);
  assert.match(page, /Professeurs inscrits/);
  assert.match(page, /Profils visibles/);
  assert.match(page, /Profils bloqués/);
  assert.match(page, /Apprenants inscrits/);
  assert.match(page, /Réservations/);
  assert.match(page, /Paiements à surveiller/);
  assert.equal(formatAdminOverviewMetric(null), ADMIN_OVERVIEW_UNAVAILABLE_LABEL);
  assert.equal(formatAdminOverviewMetric(12), "12");
  assert.equal(ADMIN_OVERVIEW_UNAVAILABLE_LABEL, "Non disponible");
});

test("priority alerts section is present and omits null counts", () => {
  const page = read("app/(app)/admin/page.tsx");
  assert.match(page, /À traiter maintenant/);
  assert.match(page, /buildAdminPriorityAlerts/);

  const empty = buildAdminPriorityAlerts(emptyAdminOverview());
  assert.equal(empty.length, 0);

  const withAlerts = buildAdminPriorityAlerts({
    ...emptyAdminOverview(),
    teachersBlocked: 3,
    stripeIncompleteTeachers: 2,
    pendingTeacherVerifications: 1,
    bookingIssues: null,
  });
  assert.equal(withAlerts.length, 3);
  assert.ok(withAlerts.every((a) => typeof a.count === "number" && a.count > 0));
});

test("promotions card links to /admin/promotions foundation without touching overview writes", () => {
  const promo = ADMIN_COMMAND_CENTER_MODULES.find((m) => m.id === "promotions");
  assert.ok(promo);
  assert.equal(promo!.status, "ready");
  assert.equal(promo!.href, "/admin/promotions");

  const page = read("app/(app)/admin/page.tsx");
  assert.match(page, /Promotions & crédits|promotions/);
  assert.doesNotMatch(page, /createCredit|issueCredit|promoCode\.create/i);

  const overviewRoute = read("app/api/admin/overview/route.ts");
  assert.doesNotMatch(overviewRoute, /credit_balance|promo_codes|insert\(/i);
});

test("bookings and payments cards link to read-only operations views", () => {
  const bookings = ADMIN_COMMAND_CENTER_MODULES.find((m) => m.id === "bookings");
  const payments = ADMIN_COMMAND_CENTER_MODULES.find((m) => m.id === "payments");
  assert.ok(bookings);
  assert.ok(payments);
  assert.equal(bookings!.status, "ready");
  assert.equal(bookings!.href, "/admin/bookings");
  assert.equal(payments!.status, "ready");
  assert.equal(payments!.href, "/admin/payments");

  const page = read("app/(app)/admin/page.tsx");
  assert.match(page, /Réservations|Paiements/);
  assert.doesNotMatch(page, /stripe\.checkout|webhook\.constructEvent/i);
  assert.doesNotMatch(page, /refund|capture|payout\.create/i);
});

test("SEO & markets card references Canada launched and Uruguay next without changing market rules", () => {
  const seo = ADMIN_COMMAND_CENTER_MODULES.find((m) => m.id === "seo");
  assert.ok(seo);
  assert.match(seo!.description, /Canada lancé/i);
  assert.match(seo!.description, /Uruguay prochain marché/i);
  assert.equal(seo!.status, "coming_soon");

  const markets = read("lib/config/markets.ts");
  assert.match(markets, /status:\s*"LAUNCHED"/);
  assert.match(markets, /status:\s*"NEXT_MARKET"/);
  // This PR must not rewrite market capability flags.
  assert.doesNotMatch(read("lib/admin/overview.ts"), /PRATIQO_MARKETS\s*=/);
  assert.doesNotMatch(read("app/(app)/admin/page.tsx"), /teacherSignupEnabled:\s*true/);
});

test("loadAdminOverview returns count-only metrics and tolerates query failures", async () => {
  const stub = {
    from(table: string) {
      if (table === "profiles") {
        return {
          select() {
            return {
              eq(_col: string, role: string) {
                return Promise.resolve({
                  count: role === "teacher" ? 4 : 9,
                  error: null,
                });
              },
            };
          },
        };
      }
      if (table === "teachers_public") {
        return {
          select() {
            return Promise.resolve({ count: 2, error: null });
          },
        };
      }
      if (table === "teacher_credentials") {
        return {
          select() {
            return {
              eq() {
                return Promise.resolve({ count: 1, error: null });
              },
            };
          },
        };
      }
      if (table === "teachers") {
        let mode: "pending" | "scan" = "pending";
        return {
          select(_cols: string, opts?: { head?: boolean }) {
            if (opts?.head) {
              mode = "pending";
              return {
                not() {
                  return {
                    or() {
                      return Promise.resolve({ count: 2, error: null });
                    },
                  };
                },
              };
            }
            mode = "scan";
            return {
              is() {
                return {
                  is() {
                    return Promise.resolve({
                      data: [
                        {
                          price_per_lesson: null,
                          availability: [],
                          stripe_account_id: null,
                          stripe_connect_onboarding_complete: false,
                          stripe_connect_charges_enabled: false,
                          is_demo: false,
                        },
                        {
                          price_per_lesson: 40,
                          availability: ["mon"],
                          stripe_account_id: "acct_1",
                          stripe_connect_onboarding_complete: true,
                          stripe_connect_charges_enabled: true,
                          is_demo: false,
                        },
                      ],
                      error: null,
                    });
                  },
                };
              },
            };
          },
          // silence unused
          mode,
        };
      }
      return {
        select() {
          return Promise.resolve({ count: null, error: { message: "missing" } });
        },
      };
    },
  };

  const overview = await loadAdminOverview(stub);
  assert.equal(overview.teachersTotal, 4);
  assert.equal(overview.studentsTotal, 9);
  assert.equal(overview.teachersVisible, 2);
  assert.equal(overview.teachersBlocked, 2);
  assert.equal(overview.pendingTeacherVerifications, 3);
  assert.equal(overview.stripeIncompleteTeachers, 1);
  assert.equal(overview.teachersMissingRate, 1);
  assert.equal(overview.teachersMissingAvailability, 1);
  assert.equal(overview.bookingsTotal, null);
  assert.equal(overview.bookingIssues, null);
  assertAdminOverviewPrivacySafe(overview);
});

async function main() {
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`ok - ${t.name}`);
    } catch (e) {
      failed += 1;
      console.error(`not ok - ${t.name}`);
      console.error(e);
    }
  }
  if (failed > 0) {
    console.error(`\n${failed} admin command-center test(s) failed`);
    process.exit(1);
  }
  console.log(`\n${tests.length} admin command-center assertions passed`);
}

void main();
