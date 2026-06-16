/**
 * Founder commission promotion — pure helpers.
 *
 * The founder promotion is an admin-controlled, time-bounded commission
 * override that grants a teacher Membre-Pro-like marketplace commission
 * conditions WITHOUT marking them as a paid Stripe Membre Pro subscriber.
 *
 * Persistence lives in `admin_founder_promotions` (migration 080); this
 * module is pure functions only — date math, snapshot resolution and
 * default constants. It must not import Stripe SDKs, Supabase clients,
 * or anything network-bound. Tests pin this contract.
 */

/** Default duration of a freshly-activated founder promotion, in months. */
export const FOUNDER_PROMO_DEFAULT_DURATION_MONTHS = 6;

/**
 * Default promotional commission rate in basis points (500 bps = 5 %).
 * Mirrors `MEMBRE_PRO_COMMISSION_MODEL.proCommissionRange.startPercent`
 * intentionally — the founder promo is described to teachers as
 * "Membre Pro-like" entry-tier commission conditions.
 */
export const FOUNDER_PROMO_DEFAULT_RATE_BPS = 500;

/**
 * Snapshot of the most relevant founder promotion row for a teacher,
 * in the shape the commission layer needs.
 *
 * `null` means "no founder promotion record at all" (same effect as
 * one whose `endsAt` is in the past or that was terminated early).
 */
export type FounderPromoSnapshot = {
  startedAt: Date | string;
  endsAt: Date | string;
  commissionRateBps: number;
  endedEarlyAt?: Date | string | null;
} | null;

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

/**
 * Returns true iff the snapshot represents a currently-active founder
 * promotion at `now`. Active means: `startedAt <= now < endsAt` and
 * `endedEarlyAt` is null/unset.
 *
 * The clock check is dynamic so the system does not need a cron to
 * "expire" promos — the next commission calculation simply stops
 * applying it after `endsAt`.
 */
export function isFounderPromoCurrentlyActive(
  snapshot: FounderPromoSnapshot,
  now: Date = new Date(),
): boolean {
  if (!snapshot) return false;
  if (snapshot.endedEarlyAt != null) {
    const endedEarly = toDate(snapshot.endedEarlyAt);
    if (endedEarly && endedEarly.getTime() <= now.getTime()) return false;
  }
  const start = toDate(snapshot.startedAt);
  const end = toDate(snapshot.endsAt);
  if (!start || !end) return false;
  if (start.getTime() > now.getTime()) return false;
  if (end.getTime() <= now.getTime()) return false;
  if (!Number.isFinite(snapshot.commissionRateBps)) return false;
  if (snapshot.commissionRateBps < 0) return false;
  return true;
}

/**
 * Compute the natural end date of a freshly-activated promotion that
 * starts at `start` and runs for `monthsToAdd` calendar months.
 *
 * Implementation note: we use `setUTCMonth` rather than adding 30-day
 * windows so the displayed end date lines up with the calendar — a
 * promo activated on Jan 15 ends on Jul 15 even though Feb has 28 days.
 */
export function computeFounderPromoEndDate(
  start: Date,
  monthsToAdd: number = FOUNDER_PROMO_DEFAULT_DURATION_MONTHS,
): Date {
  const end = new Date(start.getTime());
  const targetMonth = end.getUTCMonth() + Math.max(0, Math.floor(monthsToAdd));
  end.setUTCMonth(targetMonth);
  return end;
}
