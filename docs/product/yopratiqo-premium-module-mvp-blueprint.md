# YoPratiqo — Premium Module MVP Blueprint

**Status:** Strategic planning document — no product code has been modified  
**Branch:** docs/yopratiqo-premium-module-mvp-blueprint  
**Date:** 2026-06-01  
**Audience:** Product, business, and legal stakeholders

---

## 1. Executive Summary

YoPratiqo is a self-paced language learning product inside the Pratiqo ecosystem. It currently offers free intro modules in English, Quebec French / Francisation, Spanish, Japanese, and Italian, with a teacher bridge (teacherBridgeEnabled: true) that connects learners to real teachers on the Pratiqo marketplace.

### Why YoPratiqo Should Not Compete Head-On with Duolingo

Duolingo wins on gamification, volume, daily habit loops, and brand awareness at global scale. Competing there would require years of content production, massive retention engineering, and a free-forever model that delays monetization indefinitely. That is not the right strategy for a small, focused product.

### The Actual Advantage: The Hybrid Model

YoPratiqo's differentiation is structural, not content-based:

```
Self-paced intro → Premium learning path → Real teacher practice
```

This combination is what large platforms cannot easily replicate. Duolingo does not connect you to a local Quebec French teacher for professional integration. Rosetta Stone does not bridge you to a human being at a critical moment. YoPratiqo can.

The product does not need to be the best app in the world. It needs to be the best on-ramp to human teaching in its target markets.

### Conversion Potential Over Popularity

The first paid module should be chosen based on conversion potential, not the language with the most learners globally. A learner studying Japanese casually for pop culture affinity is unlikely to pay. A francophone professional navigating a Quebec workplace is solving a real and urgent problem. That urgency is monetizable.

---

## 2. Recommended First Premium Module

### Primary Candidate: Quebec French / Francisation — Workplace and Daily-Life Survival

**Rationale:**

- **Strongest Canadian differentiation.** No major platform focuses on Quebec French for professional integration. This is an underserved, high-intent audience.
- **High local intent.** Learners are often immigrants, international students, or professionals relocated within Canada. The need is practical, not aspirational.
- **Professional and integration motivation.** Motivation is external and urgent: keeping a job, getting promoted, passing integration requirements, or simply feeling less isolated. These are stronger purchase triggers than curiosity.
- **Natural bridge to local teachers.** After a survival module, the logical next step is practicing with a local teacher. Pratiqo's marketplace is uniquely positioned to fulfil that need.
- **Stronger monetization than casual travel modules.** A learner planning a trip to Barcelona does not have the same urgency or willingness to pay as someone who needs to function in French at work on Monday.

### Secondary Candidate: English for Confidence at Work (for Quebec Francophones)

A module designed for Quebec francophones who work in bilingual or English-dominant environments. Strong professional motivation, clear pain point (fear of embarrassing oneself in meetings or emails), and a natural Pratiqo teacher bridge for conversation practice.

### Third Candidate: Spanish — Travel and First Conversations

Lower urgency than the top two, but broader reach. Good for validating the premium funnel mechanics before investing in more specialized content. Proceed only after validating the Quebec French module.

### Japanese and Italian: Keep as Free Intro / Affinity Modules

Do not invest in paid Japanese or Italian modules until user data demonstrates clear conversion intent. These languages currently serve an affinity audience (cultural interest, travel, media). That is valuable for top-of-funnel awareness but does not yet justify premium content investment.

---

## 3. Premium Module Structure

### Module 1: Quebec French / Francisation — Workplace and Daily-Life Survival

**Target learner:** Adult immigrant, relocated professional, or international student in Quebec. Beginner to low-intermediate French. Working or seeking to work in a French-language environment.

**Module format:**
- 5 to 7 lessons
- Each lesson: 8 to 15 minutes of active learning
- Audio examples (real-sounding, natural conversational pace)
- Short vocabulary list (8–12 key words or phrases per lesson)
- Real-life scenario walkthrough
- Quick quiz (3–5 questions, low stakes)
- Reflection prompt (1 open-ended question for self-directed practice)
- Teacher bridge CTA at the end of each lesson and prominently at the end of the module

**Lesson plan (proposed):**

| # | Lesson title | Core skill |
|---|---|---|
| 1 | Arriver au travail et saluer naturellement | Greetings, small talk openers |
| 2 | Comprendre les consignes simples | Active listening, clarification |
| 3 | Poser une question sans bloquer | Asking for help without shutting down |
| 4 | Parler de son horaire et de ses disponibilités | Scheduling, time expressions |
| 5 | Gérer une petite incompréhension | Recovery phrases, patience strategies |
| 6 | Prendre un rendez-vous ou confirmer une information | Phone/email/in-person confirmation |
| 7 | Préparer une première pratique avec un professeur | Summarizing progress, setting goals |

**Lesson 7 serves a dual purpose:** it closes the learning arc and explicitly prepares the learner for their first teacher session, making the teacher bridge feel like a natural graduation rather than a sales pitch.

**Content boundaries — do not promise:**
- Exam preparation or certification outcomes
- Immigration approval, status, or legal outcomes
- Employment guarantees or job placement
- Fluency within a defined timeframe

---

## 4. Free-to-Paid Funnel

The funnel should feel premium and calm. Learners who reach the end of a free intro have already demonstrated intent. The goal is not to pressure them — it is to make the next step feel obvious and well-designed.

```
[Free intro landing page]
        ↓
[Free intro module]
        ↓
[End-of-intro unlock card]   ← premium but calm, not aggressive
        ↓
[Premium module sales page]  ← value proposition, what's included
        ↓
[Purchase]
        ↓
[Module progress]            ← lesson by lesson
        ↓
[Teacher bridge CTA]         ← at end of each lesson + end of module
        ↓
[Optional: teacher recommendation] ← future phase, consent-based
```

**Unlock card design principle:**  
Do not use aggressive countdown timers at MVP stage. The unlock card should convey confidence in the product, not urgency through scarcity. A learner who just completed a high-quality free intro needs a clear, well-designed offer — not a pressure tactic. Countdown timers can be A/B tested in a later phase after baseline conversion data is established.

The card should include:
- A summary of what they just learned
- A preview of what the premium module covers
- Social proof if available (testimonials, learner count)
- A clear price with no hidden friction
- A single primary CTA

---

## 5. Pricing Hypothesis

> **Business hypothesis only. Not implemented. Subject to legal, tax, and A/B review.**

**MVP pricing hypothesis for a one-time YoPratiqo premium module:**

**$24.99 CAD**

This price point is a hypothesis based on the following reasoning:
- High enough to signal quality and filter casual browsers
- Low enough to reduce purchase anxiety for a first digital product purchase
- One-time (not subscription) to minimize commitment friction at launch
- Comparable to a single teacher session, which frames the value well

**This price is:**
- A business hypothesis, not a final decision
- Subject to Quebec and Canadian tax configuration review
- Subject to legal review before implementation (digital goods, refund policy)
- Subject to A/B testing once baseline data exists
- Not implemented in any product config, Stripe setup, or pricing table in this task

Do not modify product configuration, Stripe, or payment infrastructure based on this document.

---

## 6. Teacher Bridge Design

The teacher bridge is the defining feature of YoPratiqo relative to standalone app competitors. It should feel earned and contextual, not like a cold upsell.

### At the End of the Premium Module

The learner should see a summary screen that includes:

1. **What they practiced** — a plain-language recap of the scenarios covered
2. **Where they spent time** — gentle, non-judgmental framing (e.g., "You revisited Lesson 3 twice — that's the lesson most learners find trickiest")
3. **A suggested teacher search CTA** — actionable and specific

**MVP CTA (generic, no matching logic required):**

```
/trouver-un-prof?q=francais
```

This is sufficient for Phase 1. No teacher matching algorithm is required to launch.

### Progress Sharing with Teachers (Future Phase)

Learners should eventually be able to share their module progress with a teacher before a session. This has genuine pedagogical value — a teacher who knows a learner struggled with "Gérer une petite incompréhension" can tailor the session accordingly.

**This must only be implemented with:**
- Explicit opt-in consent from the learner
- Clear explanation of what data is shared and with whom
- No passive or automatic sharing

This feature is not in scope for MVP. Document it here as a future phase goal, not a near-term build item.

### Future: Contextual Teacher Matching

A future version could surface teachers who specialize in workplace French, professional communication, or the learner's specific industry. This requires teacher profile data and matching logic. Do not build this yet.

---

## 7. Data and Privacy Considerations

### Future Data Types

As the premium module product is built, the following data types will be generated:

| Data type | Description |
|---|---|
| Lesson progress | Which lessons started, completed, skipped |
| Quiz answers | Individual question responses, score per attempt |
| Audio interactions | Play count, replay count, playback completion |
| Repeated mistakes | Questions answered incorrectly more than once |
| Completion status | Module started / in progress / completed |
| CTA clicks | Teacher bridge CTA interactions |
| Purchase status | Purchased, not purchased, refunded |

### Privacy Principles

- Progress sharing with teachers must require **explicit, informed, opt-in consent** from the learner — never automatic or passive
- Quiz answers and mistake patterns are sensitive learning data and should not be used for advertising or profiling
- Law 25 (Quebec) review is required before implementing any analytics that profiles learner behaviour
- No sensitive profiling should be added without dedicated privacy review
- Data retention policies for lesson progress and quiz answers must be defined before launch
- Learners must be able to request deletion of their learning data

---

## 8. Legal Review Checklist

> **This is a checklist of topics to bring to legal review. It is not a legal opinion, a final policy, or legal advice.**

Before implementing the premium module checkout and content delivery, the following topics require review by a qualified legal professional:

- [ ] Refund and cancellation policy for digital modules (not started vs. partially completed vs. fully completed)
- [ ] Whether access to a digital module constitutes a "service" or a "good" under applicable Quebec/Canadian consumer protection law
- [ ] Rules for streamed audio and interactive digital content under Quebec's *Loi sur la protection du consommateur*
- [ ] No fluency guarantee — wording for the sales page and terms of use
- [ ] No exam success guarantee — wording for any mention of language exams (TEFAQ, TEF, etc.)
- [ ] No immigration or legal advice — clear disclaimer that YoPratiqo modules are educational and do not constitute immigration advice or legal guidance
- [ ] No employment outcome guarantee — wording for professional integration content
- [ ] Distinction between YoPratiqo premium modules (digital content purchase) and Pratiqo teacher marketplace bookings (service agreement between learner and teacher)
- [ ] Tax display requirements at checkout (QST, GST) for digital educational products
- [ ] AI-generated audio disclosure — whether Quebec or Canadian law requires disclosure that audio was generated using AI technology, and if so, required wording

Do not finalize refund copy, terms of use, or any consumer-facing legal text without completing this review.

---

## 9. Technical Implementation Phases

> **This roadmap is for planning purposes. No implementation should begin without business and legal approval.**

### Phase 1 — Product Config Only

Goal: Establish the data model and module registry without any user-facing change.

- Define premium module type in product config (disabled by default: `futurePremiumEnabled: false`)
- Define module slugs (e.g., `qc-fr-workplace-survival`)
- Define lesson metadata structure (title, duration, order, type)
- No checkout integration
- No user-facing pages
- Full test coverage of config schema

### Phase 2 — Content Shell

Goal: Build gated premium lesson pages that render in preview state, verifiable by QA.

- Premium lesson pages behind config flag
- Preview state UI (locked content visible but not accessible)
- Unlock card component (static, no checkout)
- Unit and integration tests for gating logic
- No real payment flow

### Phase 3 — Checkout

Goal: Enable actual purchase of a premium module.

- Stripe price object created for the module
- Tax configuration reviewed and approved
- Receipt copy written and reviewed
- Refund policy copy written and reviewed
- Legal links in place (terms, refund policy)
- Full purchase → access flow tested
- Rollback plan documented

### Phase 4 — Progress and Teacher Bridge

Goal: Track learning progress and surface the teacher bridge.

- Lesson completion tracking
- Quiz result storage
- Teacher bridge CTA rendered post-module
- Consent flow for optional progress sharing with a teacher (future)
- Analytics events for funnel visibility

---

## 10. Do-Not-Build-Yet List

The following features are explicitly out of scope for the MVP. Do not begin building these until the MVP is validated and the business case for each is established.

| Feature | Why not yet |
|---|---|
| Subscription model | Adds retention engineering complexity; one-time purchase validates willingness to pay first |
| Complex LMS (progress dashboards, certificates, paths) | Over-engineering before product-market fit |
| Certificates of completion | Creates legal liability around learning outcomes; requires legal review |
| Exam preparation guarantees | High legal risk; out of scope for this product positioning |
| AI tutor chat | Significant product scope; not required to validate the core funnel |
| Automatic teacher matching | Requires teacher profile data and matching logic; not needed at MVP |
| Progress sharing without consent | Privacy violation; not acceptable at any phase |
| Multiple languages simultaneously | Dilutes focus; validate Quebec French module first |
| Global tax engine | Pre-validation complexity; configure for Canada/Quebec only at launch |

---

## 11. Success Metrics

### Primary Funnel Metrics

| Metric | What it tells you |
|---|---|
| Intro completion rate | Are free learners finishing the intro, or dropping off? |
| Unlock card click rate | Of completers, how many engage with the premium offer? |
| Paid conversion rate | Of unlock card viewers, how many purchase? |
| Lesson completion rate | Are paying learners actually using the product? |
| Teacher CTA click rate | Are learners engaging with the Pratiqo bridge? |
| Booking conversion from YoPratiqo | How many teacher bookings originate from a YoPratiqo learner? |

### Health and Risk Metrics

| Metric | What it tells you |
|---|---|
| Refund rate | Is the product meeting expectations? |
| Support contact rate | Is the product creating confusion or friction? |
| Support burden per paid user | Is the product sustainable operationally? |

**Target state:** High completion rate + meaningful teacher CTA clicks = the hybrid model is working. Low refund rate + low support burden = the product is clear and the offer is well-set.

---

## 12. Recommended Next 30 Days

A practical sequence to move from the current state (free intros only) toward a validated premium module launch.

| Priority | Action | Notes |
|---|---|---|
| 1 | Finish landing page visual polish | Already in progress; complete before driving traffic |
| 2 | Keep `noindex` on YoPratiqo pages until reviewed | Do not index pages that are not yet reviewed for legal/marketing copy |
| 3 | Select and confirm first premium module | This document recommends Quebec French / Workplace Survival |
| 4 | Write Module 1 lesson content | 5–7 lessons; use the structure in Section 3 |
| 5 | Send legal review checklist to lawyer | Use Section 8 of this document as the starting brief |
| 6 | Prepare Stripe / tax / refund decision | Do not implement until legal review is complete |
| 7 | Implement gated premium shell (Phase 1–2) | Only after legal and business decisions are finalized |

**Do not rush Phase 3 (checkout) ahead of legal review.** A refund dispute or consumer protection complaint at launch is far more damaging than a delayed launch.

---

## Appendix: Current Product State Reference

| Feature flag | Current state |
|---|---|
| `futurePremiumEnabled` | `false` |
| `moduleIndexingEnabled` | `false` |
| `courseSchemaEnabled` | `false` |
| `teacherBridgeEnabled` | `true` |

**Free intro modules available:**
- English
- Quebec French / Francisation
- Spanish
- Japanese
- Italian

No premium modules are implemented. This document describes the strategic path forward.

---

*This is a planning document. It does not constitute legal advice, a product commitment, or a development specification. All pricing, legal, and implementation decisions require appropriate review before execution.*
