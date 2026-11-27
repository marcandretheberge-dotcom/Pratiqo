# YoPratiqo: verified XP and real learner rankings

## Learner experience

`/yo/classement` connects the normal YoPratiqo experience to personal XP,
community standings and an accepted-friends view. The interface is available in
French, English and Spanish. Rankings can be filtered by the eight course
languages and by the current week or lifetime points. It shows the leading
learners and the signed-in learner's own position with nearby participants.
An empty board contains no demonstration profiles.

Personal XP does not require public participation. Joining the rankings is an
explicit choice, using a separate display name. A learner can leave the rankings
without erasing their personal points. Friendship requires a request using a
friend code and acceptance by the other learner. Pending requests, removal and
blocking are represented explicitly. No message or notification is sent by these
actions.

## Scoring contract

- A correct, newly completed authored course practice item earns **10 XP once**.
- Italian, German, Brazilian Portuguese, English, Spanish, Québec French,
  Japanese and Mandarin use their canonical course content and answer rules.
- The server checks the submitted answer. Browser-provided correctness, XP,
  timestamps and account IDs cannot create an award.
- A unique account/language/item receipt makes retries and concurrent requests
  idempotent. A server-enforced ceiling limits awards to 100 new items per
  `America/Toronto` calendar day.
- The competitive week starts Monday in `America/Toronto` for every participant.
  Lifetime totals remain intact when a new week begins.
- No attendance penalty, purchasable XP or change to course unlocking is added.
- Placement/final assessments, legacy local points and the older SRS ledger are
  not competitive award sources. Their evidence has a different trust contract.

The public course content includes answer keys for local practice. This design
checks answers and bounds replay; it does not certify unaided mastery or claim
to prevent all automation.

## Privacy and account boundaries

The dedicated ranking profile exposes only its opaque public identifier, chosen
alias, score and rank. Authentication IDs, email addresses, private photos,
answers, lesson histories and teacher summaries are not ranking fields. Raw
answers are used for grading and are not stored in the XP ledger.

Visibility, account eligibility, accepted friendship and blocks are applied
before ranking and neighbor selection. Existing Café blocks are honored without
enrolling a learner in the Café or importing its profile. Direct browser access
to ranking tables and write functions is denied. The application derives the
account from verified authentication, and data responses are private/no-store.

Award delivery is tied to the account active when the answer is submitted.
Signing out or switching accounts cancels pending delivery and suppresses stale
feedback. New awards appear only after server confirmation. Anonymous practice
is not uploaded later as competitive history.

New partial Italian matching and dialogue drafts retain bounded answer IDs for
resume. An older partial draft without that evidence keeps its saved learning
progress and assistance state, then offers a neutral replay notice on completion.
It cannot fabricate an answer history or award XP merely by loading the draft.

## Release evidence

The additive `yo_real_xp_rankings` migration is independent of the earlier gated
Italian SRS and daily-loop migrations. It was applied to Pratiqo as migration
`20261127012305_yo_real_xp_rankings` before the application release. Read-only
metadata confirmed all five new tables were empty, RLS was enabled and access
was restricted to the server service role. No test profiles or XP were inserted.
The new normal ranking route does not use the local rewards-preview gate and
does not activate the older daily-loop feature flags.

The reviewed feature commit `ac11dcae71a307cdc2bc343bb53f9cce3e72b66c`
completed all 18 workflows, covering:

1. Canonical grading across all eight languages and all supported response
   types, including complete matching and dialogue responses.
2. Replayed/concurrent receipts, fixed-week boundaries, totals, caps, ties and
   nearby rows under PostgreSQL.
3. Authenticated account isolation, visibility changes, friend lifecycle,
   bidirectional blocks and database privileges.
4. UI loading, sign-in return, empty/error states, real-data projection,
   responsive controls and account-switch races.
5. Build, type checking and existing course regressions on the candidate commit.

For this release, the owner explicitly requested removal of fictional profiles,
push and deployment without further testing. The final cleanup removes the
legacy demo standings and populated review fixtures. No additional manual test
run or disposable-account HTTP verification was performed; live authenticated
award and friendship behavior is not claimed as separately verified.

Run `npm run test:yo-rankings` for the focused release suite. The CI workflow
`Yo verified XP and rankings` also type-checks the full application. A merged
branch alone is not evidence of an applied migration or verified production
behavior; record those separately in the PR/release report.

`tools/yo-rankings-review` renders the actual ranking component in a separate
loopback-only harness with no profiles, earned XP or friend requests. Its browser
smoke script covers desktop and narrow layouts, filters and empty, private and
unavailable states. CI screenshots are component review evidence; they are not
evidence of live accounts, applied migrations or production scores. Record the
final source commit and production deployment separately in PR #497.
