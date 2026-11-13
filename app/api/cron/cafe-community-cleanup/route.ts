import { cafeCommunityCleanupCron } from "@/lib/cafe/communityCleanupCron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel uses GET; authenticated operations may also trigger a manual POST. */
export const GET = cafeCommunityCleanupCron;
export const POST = cafeCommunityCleanupCron;
export const HEAD = cafeCommunityCleanupCron;
export const PUT = cafeCommunityCleanupCron;
export const PATCH = cafeCommunityCleanupCron;
export const DELETE = cafeCommunityCleanupCron;
export const OPTIONS = cafeCommunityCleanupCron;
