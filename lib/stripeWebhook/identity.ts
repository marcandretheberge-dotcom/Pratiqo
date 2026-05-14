import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendIdentityFailed, sendIdentityVerified } from "@/lib/email";

const IDENTITY_EVENTS = new Set([
  "identity.verification_session.verified",
  "identity.verification_session.requires_input",
  "identity.verification_session.canceled",
]);

export async function handleIdentityEvent(event: Stripe.Event): Promise<boolean> {
  if (!IDENTITY_EVENTS.has(event.type)) return false;

  const session = event.data.object as Stripe.Identity.VerificationSession;

  if (event.type === "identity.verification_session.verified") {
    console.log("[stripe/webhook] identity.verification_session.verified received | event:", event.id);
    await handleIdentityVerified(session);
    return true;
  }

  if (event.type === "identity.verification_session.requires_input") {
    console.log("[stripe/webhook] identity.verification_session.requires_input received | event:", event.id);
    await handleIdentityFailed(session);
    return true;
  }

  console.log("[stripe/webhook] identity.verification_session.canceled received | event:", event.id);
  await handleIdentityCanceled(session);
  return true;
}

async function handleIdentityVerified(session: Stripe.Identity.VerificationSession) {
  console.log("[identity/verified] session.id:", session.id, "| status:", session.status);
  console.log("[identity/verified] metadata:", JSON.stringify(session.metadata));

  const userId = session.metadata?.user_id;
  if (!userId) {
    console.error("[identity/verified] ABORT - user_id missing from metadata. Full metadata:", session.metadata);
    return;
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log(
    "[identity/verified] admin key check - present:",
    Boolean(serviceKey),
    "| length:",
    serviceKey?.length ?? 0,
    "| looks like JWT:",
    serviceKey?.startsWith("eyJ") ?? false,
  );

  const admin = getSupabaseAdmin();

  console.log("[identity/verified] checking existing record for user_id:", userId);
  const { data: existing, error: fetchErr } = await admin
    .from("teachers")
    .select("identity_verified")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchErr) {
    console.error("[identity/verified] fetch existing failed:", fetchErr);
    return;
  }
  console.log("[identity/verified] existing row:", JSON.stringify(existing));

  if ((existing as { identity_verified?: boolean } | null)?.identity_verified) {
    console.log("[identity/verified] already verified - skipping update");
    return;
  }

  const updatePayload = {
    stripe_identity_status: "verified",
    stripe_identity_verified_at: new Date().toISOString(),
    identity_verified: true,
    identity_status: "verified",
    verification_level: 2,
  };
  console.log("[identity/verified] updating teachers row with:", JSON.stringify(updatePayload));

  const { data: updateData, error: updateErr } = await admin
    .from("teachers")
    .update(updatePayload)
    .eq("user_id", userId)
    .select("id, identity_verified, stripe_identity_status");

  if (updateErr) {
    console.error("[identity/verified] DB UPDATE FAILED:", JSON.stringify(updateErr));
    return;
  }
  console.log(
    "[identity/verified] DB update succeeded. Rows affected:",
    updateData?.length ?? 0,
    "| data:",
    JSON.stringify(updateData),
  );

  if (!updateData?.length) {
    console.warn("[identity/verified] UPDATE matched 0 rows - no teacher row with user_id:", userId);
  }

  const { error: notifErr } = await admin.from("notifications").insert({
    user_id: userId,
    title: "Identité vérifiée ✓",
    message: "Votre identité a été confirmée par Stripe. Votre badge « Identité vérifiée » est maintenant visible sur votre profil.",
    type: "system",
    read: false,
  });
  if (notifErr) console.warn("[identity/verified] notification insert failed:", notifErr);
  else console.log("[identity/verified] notification inserted for user:", userId);

  try {
    const { data: prof } = await admin
      .from("profiles")
      .select("email, name")
      .eq("id", userId)
      .maybeSingle();
    const profEmail = (prof as { email?: string | null } | null)?.email ?? null;
    const profName = (prof as { name?: string | null } | null)?.name ?? "Professeur";
    console.log("[identity/verified] sending email to:", profEmail ?? "(no email found)");
    if (profEmail) {
      await sendIdentityVerified(profEmail, profName);
      console.log("[identity/verified] email sent");
    }
  } catch (e) {
    console.error("[identity/verified] email send failed:", e);
  }
}

async function handleIdentityFailed(session: Stripe.Identity.VerificationSession) {
  console.log("[identity/failed] session.id:", session.id, "| status:", session.status);
  console.log("[identity/failed] metadata:", JSON.stringify(session.metadata));

  const userId = session.metadata?.user_id;
  if (!userId) {
    console.error("[identity/failed] ABORT - user_id missing from metadata");
    return;
  }

  const reason =
    (session as unknown as { last_error?: { reason?: string } }).last_error?.reason ||
    "Vérification échouée";
  console.log("[identity/failed] failure reason:", reason);

  const admin = getSupabaseAdmin();

  const updatePayload = {
    stripe_identity_status: "failed",
    stripe_identity_failed_reason: reason,
    identity_status: "failed",
  };
  console.log("[identity/failed] updating teachers row with:", JSON.stringify(updatePayload));

  const { data: updateData, error: updateErr } = await admin
    .from("teachers")
    .update(updatePayload)
    .eq("user_id", userId)
    .select("id, stripe_identity_status");

  if (updateErr) {
    console.error("[identity/failed] DB UPDATE FAILED:", JSON.stringify(updateErr));
  } else {
    console.log("[identity/failed] DB update succeeded. Rows affected:", updateData?.length ?? 0);
    if (!updateData?.length) {
      console.warn("[identity/failed] UPDATE matched 0 rows - no teacher row with user_id:", userId);
    }
  }

  const { error: notifErr } = await admin.from("notifications").insert({
    user_id: userId,
    title: "Vérification d'identité échouée",
    message: "Votre vérification d'identité n'a pas abouti. Vous pouvez réessayer depuis la page Vérification.",
    type: "system",
    read: false,
  });
  if (notifErr) console.warn("[identity/failed] notification insert failed:", notifErr);

  try {
    const { data: prof } = await admin
      .from("profiles")
      .select("email, name")
      .eq("id", userId)
      .maybeSingle();
    const profEmail = (prof as { email?: string | null } | null)?.email ?? null;
    const profName = (prof as { name?: string | null } | null)?.name ?? "Professeur";
    console.log("[identity/failed] sending email to:", profEmail ?? "(no email found)");
    if (profEmail) {
      await sendIdentityFailed(profEmail, profName, reason);
      console.log("[identity/failed] email sent");
    }
  } catch (e) {
    console.error("[identity/failed] email send failed:", e);
  }
}

async function handleIdentityCanceled(session: Stripe.Identity.VerificationSession) {
  console.log("[identity/canceled] session.id:", session.id, "| status:", session.status);
  console.log("[identity/canceled] metadata:", JSON.stringify(session.metadata));

  const userId = session.metadata?.user_id;
  if (!userId) {
    console.error("[identity/canceled] ABORT - user_id missing from metadata");
    return;
  }

  const admin = getSupabaseAdmin();

  const updatePayload = { stripe_identity_status: "canceled", identity_status: "none" };
  console.log("[identity/canceled] updating teachers row with:", JSON.stringify(updatePayload));

  const { data: updateData, error: updateErr } = await admin
    .from("teachers")
    .update(updatePayload)
    .eq("user_id", userId)
    .select("id, stripe_identity_status");

  if (updateErr) {
    console.error("[identity/canceled] DB UPDATE FAILED:", JSON.stringify(updateErr));
  } else {
    console.log("[identity/canceled] DB update succeeded. Rows affected:", updateData?.length ?? 0);
    if (!updateData?.length) {
      console.warn("[identity/canceled] UPDATE matched 0 rows - no teacher row with user_id:", userId);
    }
  }
}
