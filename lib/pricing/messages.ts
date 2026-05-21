import type { Locale } from "@/lib/i18n/types";
import { MIN_LESSON_PRICE_DOLLARS } from "@/lib/pricing/constants";

const MIN_LESSON_PRICE_ERROR: Record<Locale, string> = {
  fr: `Pour garantir la qualité des services sur Pratiqo et couvrir les frais de transaction sécurisée, le montant minimum par séance est de ${MIN_LESSON_PRICE_DOLLARS} $.`,
  en: `To maintain service quality on Pratiqo and cover secure transaction costs, the minimum amount per session is $${MIN_LESSON_PRICE_DOLLARS}.`,
  es: `Para mantener la calidad del servicio en Pratiqo y cubrir los costos de transacción segura, el monto mínimo por sesión es de ${MIN_LESSON_PRICE_DOLLARS} $.`,
};

const MIN_LESSON_PRICE_SUGGESTION: Record<Locale, string> = {
  fr: "Vous pouvez augmenter la durée du cours, créer un forfait de plusieurs séances ou ajuster votre tarif.",
  en: "You can increase the lesson duration, create a multi-session package, or adjust your rate.",
  es: "Puedes aumentar la duración de la clase, crear un paquete de varias sesiones o ajustar tu tarifa.",
};

export function minimumLessonPriceErrorMessage(locale: Locale = "fr"): string {
  return MIN_LESSON_PRICE_ERROR[locale] ?? MIN_LESSON_PRICE_ERROR.fr;
}

export function minimumLessonPriceSuggestionMessage(locale: Locale = "fr"): string {
  return MIN_LESSON_PRICE_SUGGESTION[locale] ?? MIN_LESSON_PRICE_SUGGESTION.fr;
}
