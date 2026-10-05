import type { EmailLocale } from "@/lib/email/locale";

export const EMAIL_FOOTER_COPY: Record<
  EmailLocale,
  { questions: string; tagline: string; supportPrompt: string }
> = {
  fr: {
    questions: "Questions&nbsp;?",
    tagline: "D&apos;ici, pour ici",
    supportPrompt: "info@pratiqo.ca",
  },
  en: {
    questions: "Questions?",
    tagline: "Local, for locals",
    supportPrompt: "info@pratiqo.ca",
  },
  es: {
    questions: "¿Preguntas?",
    tagline: "De aquí, para aquí",
    supportPrompt: "info@pratiqo.ca",
  },
};
