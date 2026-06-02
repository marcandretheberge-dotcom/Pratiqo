import assert from "node:assert/strict";
import { calculateBookingAmounts } from "@/lib/payments/commission";

type TestFn = () => void | Promise<void>;

const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

test("commission is calculated on subtotal_cents, not tax-inclusive amount_cents", () => {
  const amounts = calculateBookingAmounts({
    subtotalCents: 2000,
    taxTotalCents: 300,
    teacherPlan: "free",
    loyaltyTier: "bronze",
  });

  assert.equal(amounts.amountCents, 2300);
  assert.equal(amounts.subtotalCents, 2000);
  assert.equal(amounts.taxTotalCents, 300);
  assert.equal(amounts.platformFeeCents, 300);
  assert.equal(amounts.teacherNetCents, 1700);
});

test("phase 1 with zero tax keeps amount_cents equal to subtotal_cents", () => {
  const amounts = calculateBookingAmounts({
    subtotalCents: 2500,
    taxTotalCents: 0,
    teacherPlan: "pro",
    loyaltyTier: "bronze",
  });

  assert.equal(amounts.amountCents, 2500);
  assert.equal(amounts.subtotalCents, 2500);
  assert.equal(amounts.platformFeeCents, 125);
  assert.equal(amounts.teacherNetCents, 2375);
});

async function run() {
  for (const { name, fn } of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log(`[payments:commissionSubtotal] ${tests.length} tests passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
