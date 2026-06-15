# YoPratiqo Product Strategy

## Product Role

YoPratiqo is Pratiqo's self-paced learning product. It is not a small add-on to the marketplace; it is a product pillar that can support free introductions, future premium modules, and a bridge toward live teacher practice.

Pratiqo Marketplace remains the live teacher booking product: students find teachers, request lessons, pay for bookings, and learn with real people. YoPratiqo is the structured, self-paced layer that helps learners build context and confidence before they book.

## Funnel

The intended YoPratiqo funnel is:

- **Free intro**: lightweight, high-trust learning modules that prove quality and help learners orient themselves.
- **Premium module later**: paid self-paced modules can be added only after legal, checkout, refund, privacy, and product analytics foundations are ready.
- **Teacher booking CTA**: each module should point learners toward a relevant teacher when live practice is the natural next step.

This PR does not add paid module checkout. It only documents and configures the foundation for that later path.

## Differentiation

YoPratiqo should teach language inside culture, not as isolated vocabulary lists. Its differentiators are:

- cultural learning tied to real places and daily situations;
- practical beginner-friendly language;
- a local teacher bridge for practice and accountability;
- modules that can later give teachers learning signals without replacing human instruction.

## Current Priority Languages

The current active language pillars are:

- English
- Quebec French / Francisation
- Spanish
- Japanese
- Italian

Do not activate additional languages until the current five have stable learning depth, SEO positioning, legal coverage, and teacher-bridge coherence.

## Next Language Candidates

Future candidates, not active now:

- Korean
- Portuguese
- German
- Mandarin

These should remain candidates only. They should not appear as launched premium products or live modules until a specific product decision opens them.

## Architecture Principles

- YoPratiqo can have its own product identity while staying under the Pratiqo brand and legal entity, Cours Pratiqo Inc.
- Free intro modules are currently the only supported product type.
- Future premium modules must not share marketplace booking logic by accident.
- Teacher CTAs should connect learners to Pratiqo Marketplace without implying that self-paced progress guarantees teacher outcomes.
- SEO should be prepared now, but module indexation should remain disabled until explicitly approved.

## Related Roadmaps

- [`PRATIQO_90_DAY_REVENUE_ROADMAP.md`](./PRATIQO_90_DAY_REVENUE_ROADMAP.md) — sequences the founder's 90-day revenue plan on top of the existing production-readiness gates. It defers to this product strategy doc for the language-pillar order and to `product/yopratiqo-premium-module-mvp-blueprint.md` for premium-module structure.
