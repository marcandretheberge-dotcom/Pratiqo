"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/lib/locale-context";
import { canonicalCafeLanguage, cafeLanguageLabel } from "@/lib/cafe/communityLanguages";
import { resolveCafeRoomCourseReturn } from "@/lib/cafe/roomCourseReturn";
import { CafeEntranceScreen, CommunityFrame } from "@/components/cafe/community/CafeCommunityChrome";
import { LanguagePicker } from "@/components/cafe/community/LanguagePicker";
import { cafeText, communityLocale, type CommunityLocale } from "@/components/cafe/community/copy";
import styles from "@/components/cafe/community/community.module.css";

type PublicStep = "entrance" | "language" | "soon";

function InterfaceLanguageSwitch({
  locale,
  onChange,
}: {
  locale: CommunityLocale;
  onChange: (locale: CommunityLocale) => void;
}) {
  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  return (
    <div className={styles.interfaceLang} role="group" aria-label={t("Langue de l’interface", "Interface language", "Idioma de la interfaz")}>
      {(["fr", "en", "es"] as const).map((code) => (
        <button
          key={code}
          type="button"
          className={code === locale ? styles.interfaceLangActive : styles.interfaceLangButton}
          aria-pressed={code === locale}
          onClick={() => onChange(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

/**
 * Public Café journey when the community backend is gated off.
 * Reuses the approved entrance visuals without auth, presence, or private APIs.
 */
export function CafePublicEntrance({ heroVideoSrc = null }: { heroVideoSrc?: string | null }) {
  const { locale: rawLocale, setLocale } = useLocale();
  const locale = communityLocale(rawLocale);
  const query = useSearchParams();
  const courseReturnHref = resolveCafeRoomCourseReturn(query.get("yoReturn") ?? undefined);
  const languageHint = useMemo(() => canonicalCafeLanguage(query.get("language")), [query]);

  const [step, setStep] = useState<PublicStep>("entrance");
  const [nativeLanguages, setNativeLanguages] = useState<string[]>([]);
  const [learningLanguages, setLearningLanguages] = useState<string[]>(() => (languageHint ? [languageHint] : []));
  const [hintApplied] = useState(() => Boolean(languageHint));

  const t = (fr: string, en: string, es: string) => cafeText(locale, fr, en, es);
  const setInterfaceLocale = (next: CommunityLocale) => setLocale(next);
  const cinematic = step === "entrance";
  const canContinue = nativeLanguages.length > 0 && learningLanguages.length > 0;
  const learningSummary = learningLanguages.map((code) => cafeLanguageLabel(code, locale)).join(", ");
  const nativeSummary = nativeLanguages.map((code) => cafeLanguageLabel(code, locale)).join(", ");

  return (
    <CommunityFrame locale={locale} courseReturnHref={courseReturnHref} cinematic={cinematic}>
      {step === "entrance" && (
        <div className={styles.publicEntrance}>
          <InterfaceLanguageSwitch locale={locale} onChange={setInterfaceLocale} />
          <CafeEntranceScreen locale={locale} heroVideoSrc={heroVideoSrc} onEnter={() => setStep("language")} />
        </div>
      )}

      {step === "language" && (
        <section className={`${styles.screen} ${styles.screenScroll}`} data-cafe-step="language" aria-labelledby="cafe-public-language-title">
          <div className={styles.spread}>
            <h1 id="cafe-public-language-title" className={styles.screenTitle}>
              {t("On pratique quelle langue ?", "Which language are we practising?", "¿Qué idioma practicamos?")}
            </h1>
            <InterfaceLanguageSwitch locale={locale} onChange={setInterfaceLocale} />
          </div>
          <p className={styles.note}>
            {t(
              "Choisissez votre langue maternelle et la langue que vous souhaitez pratiquer. Ces choix restent sur cet écran pour le moment.",
              "Choose your native language and the language you want to practise. These choices stay on this screen for now.",
              "Elige tu lengua materna y el idioma que quieres practicar. Estas elecciones permanecen en esta pantalla por ahora.",
            )}
          </p>
          {hintApplied && languageHint && (
            <p className={styles.note}>
              {t(
                `Suggestion de parcours : ${cafeLanguageLabel(languageHint, locale)}. Vous pouvez la modifier.`,
                `Course suggestion: ${cafeLanguageLabel(languageHint, locale)}. You can change it.`,
                `Sugerencia del curso: ${cafeLanguageLabel(languageHint, locale)}. Puedes cambiarla.`,
              )}
            </p>
          )}
          <div className={`${styles.panel} ${styles.languagePanel}`}>
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                if (!canContinue) return;
                setStep("soon");
              }}
            >
              <div className={styles.twoColumns}>
                <LanguagePicker
                  label={t("Langue(s) maternelle(s)", "Native language(s)", "Lengua(s) materna(s)")}
                  value={nativeLanguages}
                  onChange={setNativeLanguages}
                  locale={locale}
                />
                <LanguagePicker
                  label={t("Langue(s) à pratiquer", "Language(s) to practise", "Idioma(s) a practicar")}
                  value={learningLanguages}
                  onChange={setLearningLanguages}
                  locale={locale}
                />
              </div>
              <div className={styles.row}>
                <button className={styles.primary} type="submit" disabled={!canContinue}>
                  {t("Continuer", "Continue", "Continuar")}
                </button>
                <button className={styles.button} type="button" onClick={() => setStep("entrance")}>
                  {t("Retour", "Back", "Volver")}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {step === "soon" && (
        <section className={`${styles.screen} ${styles.screenScroll}`} data-cafe-step="soon" aria-labelledby="cafe-public-soon-title">
          <div className={`${styles.panel} ${styles.languagePanel} ${styles.narrow}`}>
            <p className={styles.eyebrow}>{t("Bientôt", "Opening soon", "Próximamente")}</p>
            <h1 id="cafe-public-soon-title" className={styles.screenTitle}>
              {t("Les conversations arrivent bientôt", "Conversations are coming soon", "Las conversaciones llegan pronto")}
            </h1>
            <p className={styles.subtitle}>
              {t(
                "Le Café des langues n’accueille pas encore de conversations en direct. Vos choix de langues sont prêts pour quand les salons ouvriront.",
                "Café des langues does not host live conversations yet. Your language choices will be ready when rooms open.",
                "El Café des langues aún no aloja conversaciones en vivo. Tus idiomas elegidos estarán listos cuando abran las salas.",
              )}
            </p>
            <div className={styles.soft}>
              <p className={styles.small}>
                {t("Langue maternelle", "Native", "Lengua materna")} : {nativeSummary || "—"}
              </p>
              <p className={styles.small}>
                {t("À pratiquer", "To practise", "A practicar")} : {learningSummary || "—"}
              </p>
            </div>
            <div className={styles.row}>
              <button className={styles.primary} type="button" onClick={() => setStep("language")}>
                {t("Changer les langues", "Change languages", "Cambiar los idiomas")}
              </button>
              {courseReturnHref ? (
                <a className={styles.button} href={courseReturnHref}>
                  {t("Retour à mon parcours", "Back to my learning", "Volver a mi curso")}
                </a>
              ) : (
                <Link className={styles.button} href="/yo" prefetch={false}>
                  {t("Continuer à apprendre", "Keep learning", "Seguir aprendiendo")}
                </Link>
              )}
              <button className={styles.quiet} type="button" onClick={() => setStep("entrance")}>
                {t("Retour à l’entrée", "Back to the entrance", "Volver a la entrada")}
              </button>
            </div>
          </div>
        </section>
      )}
    </CommunityFrame>
  );
}
