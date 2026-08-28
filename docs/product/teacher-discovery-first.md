# Teacher Discovery First

Status: implementation note for `growth/teacher-discovery-first-deferred-stripe`.

## Product Rule

Teacher discovery is separate from paid booking readiness.

A teacher can appear in Pratiqo discovery when:

- the user has a teacher profile;
- the teacher/profile is active and not suspended or deleted;
- at least one discipline signal exists through `teacher_disciplines`, `discipline`, or `category`;
- identity verification has not failed.

The following are not discovery blockers:

- Stripe Connect setup;
- full biography;
- profile photo;
- rate;
- precise availability;
- public teaching zone;
- offer creation;
- `teachers.is_public`.

These remain quality, trust, or booking-readiness signals.

## Lifecycle

1. Discoverable

   The teacher has a valid profile and at least one discipline. The profile can appear in list discovery and receive learner interest.

2. Profile Incomplete

   The teacher is discoverable but still missing recommended profile details such as photo, bio, rate, availability, location, or offers. Dashboard and email nudges should encourage completion.

3. Requestable

   A learner can send an interest or booking request. This is not a paid booking and does not reserve a slot.

4. Payment Setup Required

   The teacher can receive learner demand, but Stripe Connect is incomplete. Pratiqo must not charge the learner before the teacher can receive money.

5. Bookable

   Existing paid booking requirements pass, including Stripe readiness and existing booking validation. The normal paid booking flow continues unchanged.

## Deferred Stripe Request Flow

When a student tries to book a discoverable teacher who is not payable yet:

- Pratiqo creates a no-payment `teacher_booking_requests` row.
- Pratiqo does not create a pending paid booking.
- Pratiqo does not start Stripe Checkout.
- The student sees a confirmation that the request was sent and no payment was collected.
- The teacher receives an email asking them to complete payment setup.

This PR does not implement the full follow-up workflow where the teacher later accepts the request and the student pays. The request table is the minimal durable foundation for that later step.

## Email Nudges

Two email templates exist:

- Stripe setup required after a learner request.
- Profile improvement after a profile becomes discoverable but incomplete.

The profile improvement template is trigger-ready only. This PR does not add a new cron or aggressive notification cadence.

## Admin Metrics

The admin command center remains count-only and privacy-safe. It can report:

- total teacher profiles;
- discoverable teachers via `teachers_public`;
- hidden teachers without discipline;
- profile incomplete teachers;
- Stripe incomplete teachers;
- bookable teachers;
- visible teachers with payment setup still required.

Admin metrics must not expose private addresses, emails, raw Stripe identifiers, or payment secrets.

## Guardrails

- Stripe checkout amount calculation is unchanged.
- Stripe webhook payment logic is unchanged.
- Payout, refund, reversal, commission, and Membre Pro logic are unchanged.
- Search ranking is unchanged.
- SEO profile indexability remains separate from marketplace discovery.
- Planned package payment flows remain unchanged.
