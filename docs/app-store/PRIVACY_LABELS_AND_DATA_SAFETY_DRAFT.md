# Privacy Labels And Data Safety Draft - Pratiqo

Status: Draft only. Final Apple Privacy Nutrition Label and Google Play Data Safety answers must match the live privacy policy, production data flows, SDKs, analytics, and payment configuration. Lawyer/privacy review required before submission.

## Data Categories To Review

| Category | Examples | Purpose | Notes |
|---|---|---|---|
| Account identifiers | user id, email, login state | account creation, authentication, support | Required for accounts. |
| Contact information | email, name, optional phone if collected | communication, support, booking coordination | Do not expose private contact details before allowed booking states. |
| Profile content | teacher bio, disciplines, photo, credentials when uploaded | marketplace profile and trust signals | Public teacher profile fields must be limited to safe public data. |
| Messages | student/teacher conversation content | booking coordination and support | Sensitive user-generated content. |
| Bookings | lesson requests, schedule, format, status | marketplace operation | Includes student and teacher relationship data. |
| Payment data | Stripe customer/session/payment references, receipts, refund status | payment processing, receipts, fraud prevention | Card details are handled by Stripe, not stored directly by Pratiqo unless implementation changes. |
| Location | teacher approximate teaching zone, optional learner saved location, home-lesson address when needed | search distance, lesson logistics, safety | Full learner address must remain private until the booking flow requires it. |
| Learning progress | YoPratiqo progress, flashcard state, quiz answers, module interactions | provide learning product and improve experience | Must be disclosed before broader analytics or teacher-sharing. |
| Audio interactions | play events or audio completion if tracked later | learning support, product analytics | No OpenAI generation client-side. |
| Device and diagnostics | browser, device, crash/error logs if enabled | security, debugging, reliability | Verify actual SDKs before answering store forms. |
| Analytics | search events, CTA clicks, usage metrics if enabled | improve marketplace and product | Must match consent and privacy policy. |

## Apple Privacy Nutrition Label Draft Checklist

- Data linked to user: account, contact, profile, bookings, messages, payments/receipts, saved location, learning progress if authenticated.
- Data not necessarily linked: aggregated analytics and diagnostics only if configured that way.
- Tracking: mark no unless cross-app/site tracking or advertising identifiers are actually used.
- Sensitive information: review identity verification and document upload flows before answering.
- Financial information: Stripe handles card entry; Pratiqo may store payment status and receipt references.
- Location: approximate/public teacher location and optional learner/home-lesson location require careful disclosure.
- User content: messages, profile text, uploaded photos/documents, reviews.

## Google Play Data Safety Draft Checklist

- Data collected: account info, personal info, user content, app activity, approximate location if user provides it, purchase history/payment metadata, diagnostics if enabled.
- Data shared: Stripe/payment processors, Supabase/service providers, email provider, analytics providers if configured. Confirm actual processors before submission.
- Data encrypted in transit: confirm production HTTPS and provider transport.
- Account deletion: document the user-accessible or support-assisted path before submission.
- Optional data: saved learner location and some profile details may be optional; mark accurately.
- Children/minors: Pratiqo can involve parents and minors. Age questionnaire and data practices need lawyer/privacy review.

## Must Match Live Privacy Policy

Before submitting app-store privacy labels, verify the live policy at `https://www.pratiqo.ca/legal/confidentialite` covers:

- Marketplace profiles and bookings
- Messages and reviews
- Teacher verification and uploaded files
- Optional learner/student location
- YoPratiqo progress, quiz answers, and audio interactions
- Payment processors and receipts
- Analytics and diagnostics
- Data retention and account deletion
- Law 25 requirements for Quebec

## Open Privacy Review Questions

- Can YoPratiqo progress be shared with a teacher only after explicit learner consent?
- Which analytics events are active in production versus planned?
- Are crash logs or performance tools installed in the native wrapper later?
- Does identity verification collect documents through Pratiqo, Stripe, or another provider?
- What parental consent flow is required for users/students under 14 in Quebec?
