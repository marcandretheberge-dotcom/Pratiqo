@AGENTS.md

# Pratiqo — Project Context for Claude Code

## What is Pratiqo?

Pratiqo is a global teacher marketplace platform for private lessons (music, languages, academic tutors — Phase 1). Bootstrapped startup by Marc-André Théberge based in Quebec, Canada.

URLs:
- Production: https://pratiqo.ca
- GitHub: https://github.com/marcandretheberge-dotcom/Pratiqo
- Supabase project: jwlbwmxoradmbuvqfkhe

## Stack

- Frontend: Next.js 16.2.4 (App Router, TypeScript, Tailwind)
- Database: Supabase PostgreSQL with RLS
- Auth: Supabase + Google OAuth
- Payments: Stripe Connect + webhooks
- Emails: Resend (pratiqo.ca domain verified)
- Hosting: Vercel
- Maps: Google Maps (migrating to Leaflet.js)
- AI: Anthropic Claude Sonnet (onboarding only)

## Brand Identity

- Name: Pratiqo
- Logo: Teal rounded square (#1D9E75) with stylized P + 3 dots
- Colors:
  - Teal #1D9E75 (primary)
  - Charcoal #2C2C2A (text/dark)
  - Off-white #F1EFE8 (backgrounds)
  - Mint #5DCAA5 (active states)

## Business Model

For Students:
- Free signup
- Credits via companion evolution (5$/10$/15$/25$ at milestones)
- +1$ per teacher review
- +1$ per successful referral (cap 20$/year)
- NO continuous cashback

For Teachers:
- Free plan: 10% commission, max 5 students
- Pro plan: 29.99$/month, 5% commission, unlimited
- Loyalty tiers decrease commission with volume:
  - Bronze (0-5k$): 10%/5%
  - Silver (5-15k$): 9%/4.5%
  - Gold (15-30k$): 8%/4%
  - Platinum (30k$+): 7%/3.5%

## Companion System

Students choose a companion at signup that evolves:
- Phoenix: Egg→Chick→Bird→Eagle→Phoenix
- Forest: Seed→Sprout→Tree→Big tree→Forest
- Dragon: Egg→Lizard→Young→Dragon→Legendary
- Star: Spark→Star→Bright→Shooting→Supernova

## Languages

i18n: fr-CA (default), en-CA, es
Auto-detect by IP via /api/geo
Manual switch via LocaleSwitcher

## Coding Standards

- TypeScript strict mode
- 'use client' for interactive components
- Inline styles using CSS variables (--color-text-primary)
- Always test with npm run build before committing
- Always update translations for all 3 locales

## Deployment

git add .
git commit -m "Clear description"
git push
npx vercel --prod

## What's Next (Priority)

1. Credits system (companion evolution + reviews + referrals)
2. Stripe Identity verification
3. Smart search with autocomplete
4. Pro upgrade thank you email
5. Lawyer review CGU + corporate registration

## Communication Style

Marc-André is non-technical but involved in decisions.
Explain choices simply.
Always confirm before destructive changes.
Provide deployment commands ready to copy-paste.
