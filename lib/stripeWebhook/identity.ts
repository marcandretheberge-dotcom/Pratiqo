import Stripe from "stripe";
import { sendIdentityFailed, sendIdentityVerified } from "@/lib/email";
import { logError, logInfo, logWarn } from "@/lib/log";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const IDENTITY_EVENTS = new Set([
  "identity.verification_session.verified",
  "identity.verification_session.requires_input",
  "identity.verification_session.canceled",
]);

export async function handleIdentityEvent(event: Stripe.Event): Promise<boolean> {
  if (!IDENTITY_EVENTS.has(event.type)) return false;

  const session = event.data.object as Stripe.Identity.VerificationSession;
  logInfo("[stripe/webhook] identity event received", {
    eventId: event.id,
    eventType: event.type,
    sessionId: session.id,
  });

  if (event.type === "identity.verification_session.verified") {
    await handleIdentityVerified(session);
    return true;
  }

  if (event.type === "identity.verification_session.requires_input") {
    await handleIdentityFailed(session);
    return true;
  }

  await handleIdentityCanceled(session);
  return true;
}

async function handleIdentityVerified(session: Stripe.Identity.VerificationSession) {
  logInfo("[identity/verified] processing session", {
    sessionId: session.id,
    status: session.status,
    hasUserId: Boolean(session.metadata?.user_id),
  });

  const userId = session.metadata?.user_id;
  if (!userId) {
    logError("[identity/verified] user_id missing from metadata", { sessionId: session.id });
    return;
  }

  const admin = getSupabaseAdmin();
  const { data: existing, error: fetchErr } = await admin
    .from("teachers")
    .select("identity_verified")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchErr) {
    logError("[identity/verified] fetch existing failed", { sessionId: session.id, error: fetchErr });
    return;
  }

  if ((existing as { identity_verified?: boolean } | null)?.identity_verified) {
    logInfo("[identity/verified] already verified - skipping update", { sessionId: session.id });
    return;
  }

  const { data: updateData, error: updateErr } = await admin
    .from("teachers")
    .update({
      stripe_identity_status: "verified",
      stripe_identity_verified_at: new Date().toISOString(),
      identity_verified: true,
      identity_status: "verified",
      verification_level: 2,
    })
    .eq("user_id", userId)
    .select("id, identity_verified, stripe_identity_status");

  if (updateErr) {
    logError("[identity/verified] DB update failed", { sessionId: session.id, error: updateErr });
    return;
  }

  logInfo("[identity/verified] DB update succeeded", {
    sessionId: session.id,
    rows: updateData?.length ?? 0,
  });

  if (!updateData?.length) {
    logWarn("[identity/verified] update matched 0 rows", { sessionId: session.id });
  }

  const { error: notifErr } = await admin.from("notifications").insert({
    user_id: userId,
    title: "Identité vérifiée ✓",
    message: "Votre identité a été confirmée par Stripe. Votre badge « Identité vérifiée » est maintenant visible sur votre profil.",
    type: "system",
    read: false,
  });
  if (notifErr) logWarn("[identity/verified] notification insert failed", { sessionId: session.id, error: notifErr });
  else logInfo("[identity/verified] notification inserted", { sessionId: session.id });

  try {
    const { data: prof } = await admin
      .from("profiles")
      .select("email, name")
      .eq("id", userId)
      .maybeSingle();
    const profEmail = (prof as { email?: string | null } | null)?.email ?? null;
    const profName = (prof as { name?: string | null } | null)?.name ?? "Professeur";
    logInfo("[identity/verified] sending email", {
      sessionId: session.id,
      emailPresent: Boolean(profEmail),
    });
    if (profEmail) {
      await sendIdentityVerified(profEmail, profName);
      logInfo("[identity/verified] email sent", { sessionId: session.id });
    }
  } catch (e) {
    logError("[identity/verified] email send failed", { sessionId: session.id, error: e });
  }
}

async function handleIdentityFailed(session: Stripe.Identity.VerificationSession) {
  logInfo("[identity/failed] processing session", {
    sessionId: session.id,
    status: session.status,
    hasUserId: Boolean(session.metadata?.user_id),
  });

  const userId = session.metadata?.user_id;
  if (!userId) {
    logError("[identity/failed] user_id missing from metadata", { sessionId: session.id });
    return;
  }

  const reason =
    (session as unknown as { last_error?: { reason?: string } }).last_error?.reason ||
    "Vérification échouée";
  logInfo("[identity/failed] failure reason recorded", { sessionId: session.id, reason });

  const admin = getSupabaseAdmin();
  const { data: updateData, error: updateErr } = await admin
    .from("teachers")
    .update({
      stripe_identity_status: "failed",
      stripe_identity_failed_reason: reason,
      identity_status: "failed",
    })
    .eq("user_id", userId)
    .select("id, stripe_identity_status");

  if (updateErr) {
    logError("[identity/failed] DB update failed", { sessionId: session.id, error: updateErr });
  } else {
    logInfo("[identity/failed] DB update succeeded", {
      sessionId: session.id,
      rows: updateData?.length ?? 0,
    });
    if (!updateData?.length) {
      logWarn("[identity/failed] update matched 0 rows", { sessionId: session.id });
    }
  }

  const { error: notifErr } = await admin.from("notifications").insert({
    user_id: userId,
    title: "Vérification d'identité échouée",
    message: "Votre vérification d'identité n'a pas abouti. Vous pouvez réessayer depuis la page Vérification.",
    type: "system",
    read: false,
  });
  if (notifErr) logWarn("[identity/failed] notification insert failed", { sessionId: session.id, error: notifErr });

  try {
    const { data: prof } = await admin
      .from("profiles")
      .select("email, name")
      .eq("id", userId)
      .maybeSingle();
    const profEmail = (prof as { email?: string | null } | null)?.email ?? null;
    const profName = (prof as { name?: string | null } | null)?.name ?? "Professeur";
    logInfo("[identity/failed] sending email", {
      sessionId: session.id,
      emailPresent: Boolean(profEmail),
    });
    if (profEmail) {
      await sendIdentityFailed(profEmail, profName, reason);
      logInfo("[identity/failed] email sent", { sessionId: session.id });
    }
  } catch (e) {
    logError("[identity/failed] email send failed", { sessionId: session.id, error: e });
  }
}

async function handleIdentityCanceled(session: Stripe.Identity.VerificationSession) {
  logInfo("[identity/canceled] processing session", {
    sessionId: session.id,
    status: session.status,
    hasUserId: Boolean(session.metadata?.user_id),
  });

  const userId = session.metadata?.user_id;
  if (!userId) {
    logError("[identity/canceled] user_id missing from metadata", { sessionId: session.id });
    return;
  }

  const admin = getSupabaseAdmin();
  const { data: updateData, error: updateErr } = await admin
    .from("teachers")
    .update({ stripe_identity_status: "canceled", identity_status: "none" })
    .eq("user_id", userId)
    .select("id, stripe_identity_status");

  if (updateErr) {
    logError("[identity/canceled] DB update failed", { sessionId: session.id, error: updateErr });
  } else {
    logInfo("[identity/canceled] DB update succeeded", {
      sessionId: session.id,
      rows: updateData?.length ?? 0,
    });
    if (!updateData?.length) {
      logWarn("[identity/canceled] update matched 0 rows", { sessionId: session.id });
    }
  }
}
