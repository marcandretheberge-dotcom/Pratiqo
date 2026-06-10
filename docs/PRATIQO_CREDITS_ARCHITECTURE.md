# Pratiqo Credits Architecture

Status: design-only foundation. This document does not launch paid credits, does not create financial balances, and does not authorize checkout, refunds, expiry, or app-store purchase behavior.

## Purpose

Pratiqo Credits may eventually work across the Pratiqo marketplace and YoPratiqo. The launch-safe foundation should treat credits as a ledger-backed product concept, not a mutable UI number.

## Ledger First

Credits should use an append-only ledger, not a simple mutable balance. A displayed balance can be derived from ledger entries, but the source of truth should remain the ledger because credits may have different origins, expiry rules, refund rules, and accounting treatment.

Each future ledger entry should preserve:

- user id
- credit amount
- source type
- source reference
- status
- creation date
- expiry date if legally allowed and disclosed
- reversal or adjustment reference
- audit metadata

## Credit Kinds

Paid credits and promotional credits must be distinguishable.

- Paid credits: purchased value, potentially subject to consumer protection, refund, tax, and app-store rules.
- Promotional credits: goodwill, referral, onboarding, or campaign credit.
- Refund credits: possible alternative resolution only after legal review and user disclosure.
- Companion or learning rewards: promotional only unless reviewed otherwise.

Credits are not cash and are not withdrawable unless legal/accounting review explicitly approves that treatment.

## Possible Use Cases

- Marketplace lesson discount
- YoPratiqo module unlock
- Refund credit
- Promotional onboarding credit
- Companion milestone reward

## Risks

- Accounting treatment for paid and promotional credits
- Tax display and remittance
- Expiry rules and required notices
- Refund rights and reversals
- Consumer protection treatment in Canada, Quebec, and future markets
- App store native purchase policy if credits unlock digital content in a React Native app
- Fraud, chargebacks, and duplicate ledger entries

## Native App Considerations

If YoPratiqo ships as a React Native app, credits that unlock digital modules may trigger app-store in-app purchase policy. Marketplace lesson discounts may be treated differently from digital content unlocks. The API contract should keep credit source, credit use, and product type explicit so web and native clients can follow different purchase rules when required.

## Review Required

Legal/accounting review is required before launch.

Open questions:

- Can paid credits expire, and what notice is required?
- Are refund credits legally equivalent to cash refunds in any market?
- Can credits be used for both marketplace services and digital modules?
- What disclosures are required before purchase?
- How should unused paid credits be handled if Pratiqo changes or discontinues a product?
- How should app-store purchase rules apply to YoPratiqo module unlocks?
