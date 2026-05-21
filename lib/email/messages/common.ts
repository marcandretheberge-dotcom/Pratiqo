import type { EmailLocale } from "@/lib/email/locale";

export const EMAIL_FOOTER_COPY: Record<
  EmailLocale,
  { questions: string; tagline: string; supportPrompt: string }
> = {
  fr: {
    questions: "Questions&nbsp;?",
    tagline: "D&apos;ici, pour ici",
    supportPrompt: "support@pratiqo.ca",
  },
  en: {
    questions: "Questions?",
    tagline: "Local, for locals",
    supportPrompt: "support@pratiqo.ca",
  },
  es: {
    questions: "¿Preguntas?",
    tagline: "De aquí, para aquí",
    supportPrompt: "support@pratiqo.ca",
  },
};
