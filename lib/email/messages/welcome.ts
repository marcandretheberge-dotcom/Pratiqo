import { escapeHtml, tealBox } from "@/lib/email/layout";
import { resolveEmailLocaleFromOptional, type EmailLocale } from "@/lib/email/locale";

export type WelcomeStudentCopy = {
  subject: (name: string) => string;
  heroTitle: (name: string) => string;
  heroSubtitle: string;
  bodyHtml: (name: string) => string;
  ctaText: string;
};

export type WelcomeTeacherCopy = {
  subject: (name: string) => string;
  heroTitle: (name: string) => string;
  heroSubtitle: string;
  bodyHtml: (name: string) => string;
  ctaText: string;
};

const WELCOME_STUDENT_COPY: Record<EmailLocale, WelcomeStudentCopy> = {
  fr: {
    subject: (name) => `Bienvenue chez Pratiqo, ${name} — ici, ta progression compte vraiment 🌱`,
    heroTitle: (name) => `Bienvenue chez Pratiqo, ${name}!`,
    heroSubtitle: "La plateforme de cours privés 100 % québécoise",
    bodyHtml: (name) => {
      const n = escapeHtml(name);
      return `
        <p>On est vraiment contents de t'avoir ici, ${n}.</p>
        <p>Pratiqo, c'est une plateforme fondée au Québec, pour le Québec. Chaque cours que tu réserves ici soutient un professeur local — un voisin, un artiste, un expert de ta communauté. <strong>C'est ça, acheter local.</strong></p>

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          🐉 Ton compagnon d'apprentissage t'attend
        </h2>
        <p>Commence par choisir ton compagnon — il évoluera avec toi au fil de tes cours et te motivera à progresser.</p>

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          💰 Tes crédits Pratiqo
        </h2>
        <p>Chez Pratiqo, tes cours te rapportent des crédits que tu peux utiliser sur tes prochaines réservations&nbsp;:</p>
        ${tealBox(`
          <strong>Jalons du compagnon</strong><br>
          · Étape 2 → <strong>+5 $</strong><br>
          · Étape 3 → <strong>+10 $</strong><br>
          · Étape 4 → <strong>+15 $</strong><br>
          · Étape 5 → <strong>+25 $</strong><br><br>
          <strong>+1 $</strong> par ami parrainé (toi et ton ami, cap 20 $/an)
        `)}

        <p>Ces crédits s'appliquent directement à ta prochaine réservation, automatiquement.</p>
        <p style="margin-top:24px;font-size:14px;color:#6B6A65;">
          Des questions? Réponds à cet email, on est là.
        </p>
      `;
    },
    ctaText: "Choisir mon compagnon",
  },
  en: {
    subject: (name) => `Welcome to Pratiqo, ${name} — your progress matters here 🌱`,
    heroTitle: (name) => `Welcome to Pratiqo, ${name}!`,
    heroSubtitle: "Private lessons from trusted local teachers",
    bodyHtml: (name) => {
      const n = escapeHtml(name);
      return `
        <p>We're glad you're here, ${n}.</p>
        <p>Pratiqo connects you with local teachers in your community. Every lesson you book supports an independent educator near you — a neighbour, an artist, a specialist you can trust. <strong>That's learning local.</strong></p>

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          🐉 Your learning companion is waiting
        </h2>
        <p>Start by choosing your companion — it grows with you as you take lessons and helps you stay motivated.</p>

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          💰 Pratiqo credits
        </h2>
        <p>Your lessons can earn credits you can use on future bookings:</p>
        ${tealBox(`
          <strong>Companion milestones</strong><br>
          · Stage 2 → <strong>+$5</strong><br>
          · Stage 3 → <strong>+$10</strong><br>
          · Stage 4 → <strong>+$15</strong><br>
          · Stage 5 → <strong>+$25</strong><br><br>
          <strong>+$1</strong> per referred friend (you and your friend, $20/year cap)
        `)}

        <p>Credits apply automatically on your next booking.</p>
        <p style="margin-top:24px;font-size:14px;color:#6B6A65;">
          Questions? Reply to this email — we're here to help.
        </p>
      `;
    },
    ctaText: "Choose my companion",
  },
  es: {
    subject: (name) => `Bienvenido a Pratiqo, ${name} — aquí tu progreso importa 🌱`,
    heroTitle: (name) => `¡Bienvenido a Pratiqo, ${name}!`,
    heroSubtitle: "Clases particulares con profesores locales de confianza",
    bodyHtml: (name) => {
      const n = escapeHtml(name);
      return `
        <p>Nos alegra tenerte aquí, ${n}.</p>
        <p>Pratiqo te conecta con profesores locales en tu comunidad. Cada clase que reservás apoya a un educador independiente cerca tuyo — un vecino, un artista, un especialista en quien podés confiar. <strong>Así es aprender en local.</strong></p>

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          🐉 Tu compañero de aprendizaje te espera
        </h2>
        <p>Empezá eligiendo tu compañero — crece con vos a medida que tomás clases y te ayuda a mantener la motivación.</p>

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          💰 Créditos Pratiqo
        </h2>
        <p>Tus clases pueden generar créditos para tus próximas reservas:</p>
        ${tealBox(`
          <strong>Hitos del compañero</strong><br>
          · Etapa 2 → <strong>+5 $</strong><br>
          · Etapa 3 → <strong>+10 $</strong><br>
          · Etapa 4 → <strong>+15 $</strong><br>
          · Etapa 5 → <strong>+25 $</strong><br><br>
          <strong>+1 $</strong> por amigo referido (para vos y tu amigo, tope 20 $/año)
        `)}

        <p>Los créditos se aplican automáticamente en tu próxima reserva.</p>
        <p style="margin-top:24px;font-size:14px;color:#6B6A65;">
          ¿Preguntas? Respondé a este correo — estamos para ayudarte.
        </p>
      `;
    },
    ctaText: "Elegir mi compañero",
  },
};

const WELCOME_TEACHER_COPY: Record<EmailLocale, WelcomeTeacherCopy> = {
  fr: {
    subject: () => `Bienvenue Professeur — ici, ton expertise est valorisée à sa juste valeur 🎓`,
    heroTitle: (name) => `Bienvenue, ${name}!`,
    heroSubtitle: "Tu rejoins la plateforme qui redistribue ses profits aux profs.",
    bodyHtml: (name) => {
      const n = escapeHtml(name);
      return `
        <p>Bonjour ${n},</p>
        <p>On a construit Pratiqo parce qu'on trouvait franchement injuste qu'un professeur qui travaille fort se fasse couper 25 % ou 30 % de commission par des plateformes qui ne comprennent pas leur réalité. Tu mérites mieux.</p>

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          📉 Des commissions qui baissent avec ton volume
        </h2>
        ${tealBox(`
          <strong>Programme de fidélité Pratiqo</strong><br><br>
          🥉 Bronze (0–5 000 $CA) → commission <strong>15 % / 5 %</strong> (gratuit / pro)<br>
          🥈 Argent (5 000–15 000 $CA) → <strong>14 % / 4,5 %</strong><br>
          🥇 Or (15 000–30 000 $CA) → <strong>13 % / 4 % + 0,5 % ristourne</strong><br>
          🏆 Platine (30 000 $CA+) → <strong>12 % / 3,5 % + 1 % ristourne</strong>
        `)}

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          📊 Ristourne annuelle
        </h2>
        <p>Chaque année, lorsqu'elle est offerte, la ristourne annuelle correspond à 5 % des profits nets admissibles de la marketplace Pratiqo, à l'exclusion des profits générés par YoPratiqo et tout autre produit autonome distinct, selon les conditions applicables et le volume relatif de chaque professeur Pro éligible. Ce n'est pas un revenu garanti : tes gains dépendent de ton activité, de tes disponibilités, de tes tarifs et de la demande.</p>

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          🇨🇦 D'ici, pour ici
        </h2>
        <p>Pratiqo, c'est une initiative québécoise. Chaque professeur sur notre plateforme contribue à bâtir un écosystème éducatif local, équitable et transparent. On publie un rapport annuel de nos finances — parce que la transparence, ça devrait être la norme.</p>

        <p style="margin-top:24px;font-size:14px;color:#6B6A65;">
          Questions ou suggestions? Réponds directement à cet email — je lis tout personnellement.
        </p>
      `;
    },
    ctaText: "Mon tableau de bord",
  },
  en: {
    subject: () => `Welcome, teacher — your expertise deserves fair value on Pratiqo 🎓`,
    heroTitle: (name) => `Welcome, ${name}!`,
    heroSubtitle: "You join a platform that shares profits back with teachers.",
    bodyHtml: (name) => {
      const n = escapeHtml(name);
      return `
        <p>Hi ${n},</p>
        <p>We built Pratiqo because hard-working teachers deserve better than losing 25–30% to platforms that don't understand their reality. Your expertise should be valued fairly.</p>

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          📉 Commissions that drop as you grow
        </h2>
        ${tealBox(`
          <strong>Pratiqo loyalty program</strong><br><br>
          🥉 Bronze (CAD $0–CAD $5,000) → <strong>15% / 5%</strong> fee (Free / Pro Member)<br>
          🥈 Silver (CAD $5,000–CAD $15,000) → <strong>14% / 4.5%</strong><br>
          🥇 Gold (CAD $15,000–CAD $30,000) → <strong>13% / 4% + 0.5% profit-sharing</strong><br>
          🏆 Platinum (CAD $30,000+) → <strong>12% / 3.5% + 1% profit-sharing</strong>
        `)}

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          📊 Annual profit sharing
        </h2>
        <p>Each year, when offered, the annual profit-sharing pool corresponds to 5% of eligible Pratiqo marketplace net profits, excluding profits generated by YoPratiqo and any other separate self-paced product, subject to applicable conditions and each eligible Pro Member teacher's relative volume. It is not guaranteed income: your earnings depend on your activity, availability, pricing, and demand.</p>

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          🌱 Local, for locals
        </h2>
        <p>Pratiqo is built for local education communities. Every teacher on the platform helps build a fairer, more transparent ecosystem. We publish an annual financial transparency report — because that should be the norm.</p>

        <p style="margin-top:24px;font-size:14px;color:#6B6A65;">
          Questions or suggestions? Reply to this email — we read every message.
        </p>
      `;
    },
    ctaText: "My dashboard",
  },
  es: {
    subject: () => `Bienvenido, profe — tu experiencia merece un valor justo en Pratiqo 🎓`,
    heroTitle: (name) => `¡Bienvenido, ${name}!`,
    heroSubtitle: "Te sumás a una plataforma que redistribuye ganancias a los profes.",
    bodyHtml: (name) => {
      const n = escapeHtml(name);
      return `
        <p>Hola ${n},</p>
        <p>Creamos Pratiqo porque un profe que trabaja fuerte no debería perder 25–30 % en comisiones en plataformas que no entienden su realidad. Tu experiencia merece un valor justo.</p>

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          📉 Comisiones que bajan con tu volumen
        </h2>
        ${tealBox(`
          <strong>Programa de fidelidad Pratiqo</strong><br><br>
          🥉 Bronce (0–5 000 $CA) → comisión <strong>15 % / 5 %</strong> (gratis / Miembro Pro)<br>
          🥈 Plata (5 000–15 000 $CA) → <strong>14 % / 4,5 %</strong><br>
          🥇 Oro (15 000–30 000 $CA) → <strong>13 % / 4 % + 0,5 % redistribución</strong><br>
          🏆 Platino (30 000 $CA+) → <strong>12 % / 3,5 % + 1 % redistribución</strong>
        `)}

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          📊 Redistribución anual
        </h2>
        <p>Cada año, cuando se ofrece, la redistribución anual corresponde al 5 % de las ganancias netas elegibles de la marketplace Pratiqo, excluyendo las ganancias generadas por YoPratiqo y cualquier otro producto autónomo separado, según las condiciones aplicables y el volumen relativo de cada profesor Miembro Pro elegible. No es un ingreso garantizado: tus ingresos dependen de tu actividad, disponibilidad, precios y demanda.</p>

        <h2 style="font-size:17px;font-weight:700;margin:28px 0 12px;color:#2C2C2A;">
          🌱 De aquí, para aquí
        </h2>
        <p>Pratiqo apoya comunidades educativas locales. Cada profe en la plataforma ayuda a construir un ecosistema más justo y transparente. Publicamos un informe financiero anual — porque la transparencia debería ser la norma.</p>

        <p style="margin-top:24px;font-size:14px;color:#6B6A65;">
          ¿Preguntas o sugerencias? Respondé a este correo — leemos cada mensaje.
        </p>
      `;
    },
    ctaText: "Mi panel",
  },
};

export function getWelcomeStudentCopy(locale?: EmailLocale): WelcomeStudentCopy {
  const resolved = resolveEmailLocaleFromOptional(locale);
  return WELCOME_STUDENT_COPY[resolved];
}

export function getWelcomeTeacherCopy(locale?: EmailLocale): WelcomeTeacherCopy {
  const resolved = resolveEmailLocaleFromOptional(locale);
  return WELCOME_TEACHER_COPY[resolved];
}
