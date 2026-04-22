-- Stripe Connect: connected account id per teacher; optional payment intent on booking
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS stripe_account_id text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
