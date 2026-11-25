"use client";
import type { YoLocale } from "@/lib/yo/types";
import type { OnboardingSnapshot } from "@/lib/yo/onboarding/draftStore";

const copy = {
  fr: { invalid: "Ton profil, le parcours ou ce questionnaire a changé. Recharge la page pour reprendre.", finished: "Ce choix a déjà été terminé. Recharge la page pour retrouver ton parcours.", reload: "Recharger la page", changed: "Tes choix ont été mis à jour dans une autre fenêtre. Vérifie-les avant de continuer.", local: "La sauvegarde est indisponible. Tes choix restent dans cette séance seulement." },
  en: { invalid: "Your profile, course or this check has changed. Reload the page to continue.", finished: "This setup has already been completed. Reload the page to return to your journey.", reload: "Reload the page", changed: "Your choices were updated in another window. Review them before continuing.", local: "Saving is unavailable. Your choices last for this session only." },
  es: { invalid: "Tu perfil, el curso o este cuestionario ha cambiado. Recarga la página para continuar.", finished: "Esta configuración ya se completó. Recarga la página para volver a tu recorrido.", reload: "Recargar la página", changed: "Tus opciones cambiaron en otra ventana. Revísalas antes de continuar.", local: "No se puede guardar. Tus opciones duran solo esta sesión." },
};
export function OnboardingDraftNotice({ snapshot, locale }: { snapshot: Pick<OnboardingSnapshot<unknown>, "storageError" | "changedElsewhere" | "invalidated" | "consumed">; locale: YoLocale }) {
  const c = copy[locale];
  if (snapshot.invalidated || snapshot.consumed) return <div role="alert" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p>{snapshot.invalidated ? c.invalid : c.finished}</p><button type="button" className="mt-2 min-h-11 font-semibold underline" onClick={() => window.location.reload()}>{c.reload}</button></div>;
  if (snapshot.storageError || snapshot.changedElsewhere) return <p role="status" className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-950">{snapshot.storageError ? c.local : c.changed}</p>;
  return null;
}
