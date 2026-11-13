# Café des langues: open community, text first

Status: implemented on a review branch; not activated in production.

Date: 2026-11-13

## Product decision

The product owner explicitly chose an open, modern chat community. Café navigation is visible from day one in Pratiqo and YoPratiqo. Every eligible adult member may create a conversation room. Text is the initial interaction; an accepted invitation opens a separate optional video experience. The interface avoids describing these exchanges as “guided”. Languages are independent of the course catalogue.

This decision supersedes ADR 001's provisional restriction of hosting to an administrator or designated host **for the new community surface**. The earlier scheduled-session implementation and its authorization remain intact. Café continues to use the existing account identity and a separate domain from commercial lessons, bookings, teacher roles and payments.

## What a member sees

The public navigation links to `/cafe`. Signed-out visitors see the invitation to meet people and sign in with their existing Pratiqo account. Authenticated newcomers choose a display name, one or more mother tongues, and one or more learning languages; they explicitly accept the adult community rules. The picker includes the ISO 639-1 catalogue and additional language tags, so a course's availability never controls who may participate.

The lobby lists people currently present in Café and creators of visible rooms. Scheduled-room creators may be offline and are labelled accordingly. Each person has a chosen display name, mother tongue(s), and learning languages. Presence is confined to the Café activity; it does not disclose who is elsewhere in Pratiqo. The interface displays genuine empty states and never supplies invented members to the live API.

Members can join an open room, start a text room immediately, or schedule one for a future date. Scheduled times are stored as instants and displayed in the viewer's time zone. A scheduled creator opens their room at or after its start time. An RSVP expresses attendance subject to room availability; the creator counts toward capacity. The initial capacity range is 2–8 and includes the creator. Each account has one active room membership at a time.

Yo entry points carry a language hint and a sanitized return path. Members can enter Café directly, without completing an exercise. Returning from a call to chat, or from Café to a course, uses a full document navigation where a Permissions-Policy change is required.

## Text and presence

Text rooms use authenticated HTTP reads, normally every two seconds for the current room and eight seconds in the lobby. Every read and command runs current authorization in PostgreSQL. There is no client-authorized Broadcast channel whose cached authorization could outlive a block.

Presence is per browser tab with a 90-second lease. The text UI sends a heartbeat about every 25 seconds; the call page keeps its text-room membership alive about every 20 seconds. Backgrounded text tabs pause polling. A stale creator ends the effective room; an ordinary stale member must rejoin. Browser closing and visibility changes cannot leave a permanent online indicator.

Only active members can read messages, and only messages from periods when they belonged to the room. Leaving and later rejoining does not reveal intervening history. A snapshot returns at most the latest 100 eligible messages. Message and room creation retries reuse stable request IDs to prevent duplicates after a lost response.

These are member-authenticated conversations, not end-to-end encrypted messages. Text is stored in private database tables. Current implementation retains it until associated member/room deletion; no automatic age-based chat/report purge is introduced by this change. A retention policy and corresponding tested purge should be resolved before broad public activation. Selected report evidence is copied separately and visible only through the admin report RPC; it is not a transcript export.

## Blocking and reporting

Blocking immediately removes local exposure, invalidates pending UI responses and, on successful server commit, prevents further shared interaction. An ordinary member who blocks someone leaves their shared room. A creator can remove the other member from the creator's own room. Owner removal, room closure and personal blocking have distinct authorization checks.

A block is independent of a report. A member can report before or after blocking, choose up to ten genuine messages they were entitled to see, and provide optional details. Sexual comments or behaviour are an explicit reason. Cancelling the report does not undo a block. A failed network request is shown as an unsaved block/report; the UI does not claim persistence it cannot verify.

Reports go to `/admin/cafe/community`. Both listing and review use the existing database admin role, checked at the RPC boundary. Merely knowing an admin page or endpoint cannot grant access. The first moderation surface supports review and selected evidence; it does not pretend reports are automatically investigated or that marking reviewed bans an account.

## Optional private calls

Both people must be current, eligible, unblocked members of the same text room. Only the invitation's recipient may accept. Pending invitations expire after two minutes; declined invitations have a cooldown. Each person has at most one pending/accepted call. An accepted call lasts at most 60 minutes from acceptance.

Acceptance exposes a link to `/cafe/appels/[callId]`. It does not create a media frame or request camera/microphone access. Each participant separately chooses their media settings and presses Join. Camera and microphone choices start off and reset when the call/account changes. The lobby and chat retain camera/microphone-denying headers. The call route permits only self and the configured Daily origin; screen capture stays disabled.

Every accepted pair gets a distinct deterministic private Daily room with capacity two. Both tokens have participant permissions, never owner/admin permissions. Server authorization is checked before provisioning, before minting, and after minting. Tokens never enter URLs, persistent storage or logs. Daily chat, shared chat history, recording, transcription storage and screen sharing remain disabled.

The call page checks authorization about every two seconds and gives individual checks a deadline. End, block, sign-out, connectivity loss, rejected authorization or page exit stops local media and invalidates stale joins. Removing the SDK iframe closes its browsing context while asynchronous teardown finishes. A pending report cannot disable blocking. Reporting an unrecorded call stores the member's description, not invented audiovisual evidence.

## Durable provider teardown

Provider requests happen outside database transactions. Block, room departure/removal, expiry and call end commit access revocation and a cleanup obligation first. The close worker ejects and bans **both** opaque participant identities before deleting the provider room. Failed teardown preserves the successful database action and returns `cleanupPending` instead of undoing a block.

The private outbox retains the IDs needed for teardown independently of account, room and call foreign keys. Deletion triggers preserve obligations during account deletion. Requeues advance a generation; acknowledgment compares that generation, so an old worker cannot erase newer cleanup. A service-only compensation RPC requeues retained closed/deleted calls when a late provisioning attempt finishes after prior cleanup. Completed rows are pruned after seven days.

Each member mutation handles at most two authorized cleanup rows. The cron handles at most three, reserving time within the 60-second function duration. The cron can close calls even when feature flags are disabled. These are bounded retries, not a guarantee that a provider outage can be resolved instantly. Call room expiry remains an additional server-side bound.

The current Vercel Hobby deployment cannot accept a sub-daily cron. An optional GitHub Actions workflow retries the authenticated close-only endpoint on a five-minute schedule instead. It is disabled until explicitly configured and enabled; scheduled runs use the default branch only. GitHub may delay or drop scheduled runs, so this interval is not a teardown deadline. Immediate member-triggered cleanup, authorization revocation and provider room expiry remain separate mechanisms. Verify the deployed retry worker, its capacity and its operating cost before opening video; see the [release runbook](../../operations/cafe-community-rollout.md).

## Data and concurrency boundary

All community storage is in `cafe_private`, with RLS enabled and direct grants revoked from anonymous, authenticated and service roles. The trusted server derives actor IDs from `auth.getUser` and invokes explicitly granted service-only RPCs. Active-account status, bans, deletions and community agreements are checked again in the database. Public response DTOs expose only the member fields required by Café.

An initial short transaction-scoped global advisory lock serializes community decisions. No network call is made while holding it. This deliberately favors simple race-safe membership, capacity and block decisions for the pilot. It is a measured throughput limitation: load-test and replace it with a proven narrower lock order before scaling beyond the pilot; do not remove it without concurrent authorization tests. Public list snapshots are capped at 500 and prioritize the current requested room.

## Evidence boundaries

The new suite includes real PostgreSQL execution through PGlite, SQL-to-HTTP integration, actual React component interactions with network doubles, provider race tests, and a native PostgreSQL concurrency job. A separately gated browser preview uses clearly labelled synthetic members and messages. Its desktop/mobile screenshots prove rendering and interactions only.

A green preview or mocked provider test does not prove a live Daily room, device capture, or two-account isolation. The release runbook requires those real checks on the final candidate separately.
