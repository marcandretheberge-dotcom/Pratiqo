export type CommunityLocale = "fr" | "en" | "es";
export function communityLocale(locale: string): CommunityLocale {
  return locale === "en" || locale === "es" ? locale : "fr";
}
export function cafeText(locale: CommunityLocale, fr: string, en: string, es: string): string {
  return locale === "en" ? en : locale === "es" ? es : fr;
}
export function communityError(code: string, locale: CommunityLocale): string {
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  if (["unauthorized", "unauthenticated", "invalid_token", "auth_required", "permanent_account_required"].includes(code)) return t("Votre session a expiré ou nécessite un compte confirmé. Reconnectez-vous pour continuer.", "Your session expired or needs a confirmed account. Sign in again to continue.", "Tu sesión ha caducado o necesita una cuenta confirmada. Inicia sesión para continuar.");
  if (["account_inactive", "account_unavailable"].includes(code)) return t("L’accès au Café n’est pas disponible pour ce compte.", "Café access is not available for this account.", "El acceso al Café no está disponible para esta cuenta.");
  if (["room_access_denied", "not_room_member", "room_not_found", "room_unavailable", "room_closed", "membership_expired", "room_not_joined"].includes(code)) return t("Vous n’êtes plus dans ce salon. Retrouvez les salons ouverts ci-dessous pour rejoindre à nouveau.", "You are no longer in this room. Find an open room below to rejoin.", "Ya no estás en esta sala. Busca una sala abierta para volver a entrar.");
  if (["blocked", "member_blocked", "access_denied", "forbidden", "not_allowed"].includes(code)) return t("Cette action n’est plus disponible pour votre compte ou cette personne.", "This action is no longer available for your account or this person.", "Esta acción ya no está disponible para tu cuenta o esta persona.");
  if (["room_full", "capacity_full", "capacity_reached"].includes(code)) return t("Ce salon est complet. Vous pouvez créer le vôtre.", "This room is full. You can start your own.", "Esta sala está llena. Puedes crear la tuya.");
  if (["already_in_room", "room_limit"].includes(code)) return t("Vous avez déjà un salon ouvert ou atteint la limite de salons. Fermez votre salon actuel avant d’en créer un autre.", "You already have an open room or reached the room limit. Close your current room before creating another.", "Ya tienes una sala abierta o has alcanzado el límite. Cierra tu sala actual antes de crear otra.");
  if (code === "room_not_started") return t("Le salon n’est pas encore ouvert. Son créateur peut l’ouvrir à l’heure prévue.", "This room has not opened yet. Its creator can open it at the scheduled time.", "La sala aún no está abierta. Su creador puede abrirla a la hora prevista.");
  if (["call_cooldown", "invitation_cooldown", "cooldown", "rate_limited"].includes(code)) return t("Patientez un instant avant de réessayer. Respectez le choix de l’autre personne.", "Please wait before trying again. Respect the other person’s choice.", "Espera un momento antes de volver a intentarlo. Respeta la decisión de la otra persona.");
  if (["call_busy", "call_conflict", "already_in_call"].includes(code)) return t("Une invitation ou un appel est déjà en cours pour l’un de vous.", "One of you already has an invitation or call in progress.", "Uno de los dos ya tiene una invitación o llamada en curso.");
  if (["call_expired", "invitation_expired", "call_not_pending"].includes(code)) return t("Cette invitation a expiré. Vous pouvez continuer à discuter par écrit.", "This invitation expired. You can keep chatting by text.", "Esta invitación ha caducado. Pueden seguir conversando por texto.");
  if (["provider_disabled", "video_disabled", "cafe_room_provider_disabled"].includes(code)) return t("Les appels sont momentanément indisponibles. Le chat reste ouvert.", "Calls are temporarily unavailable. Text chat is still open.", "Las llamadas no están disponibles por el momento. El chat sigue abierto.");
  if (["invalid_request", "invalid_profile", "invalid_languages"].includes(code)) return t("Vérifiez les champs et réessayez.", "Check the fields and try again.", "Revisa los campos y vuelve a intentarlo.");
  if (code === "profile_required") return t("Complétez votre profil Café pour continuer.", "Complete your Café profile to continue.", "Completa tu perfil del Café para continuar.");
  return t("La connexion au Café a été interrompue. Vos messages affichés sont conservés. Actualisez avant de continuer.", "The Café connection was interrupted. Your displayed messages are kept. Refresh before continuing.", "Se interrumpió la conexión con el Café. Los mensajes visibles se conservan. Actualiza para continuar.");
}
