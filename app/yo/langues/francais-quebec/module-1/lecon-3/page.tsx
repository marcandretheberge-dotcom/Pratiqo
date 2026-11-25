import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CheckCircle2, Map, MessageCircle, Sparkles, Target } from "lucide-react";

import { CompanionAvatar } from "@/components/companion/CompanionAvatar";
import { YoAdaptiveStepShell } from "@/components/yo/YoAdaptiveStepShell";
import { YoAppHeader } from "@/components/yo/YoAppHeader";
import { YoStepNavigator } from "@/components/yo/YoStepNavigator";
import { YoLessonDraftProvider } from "@/components/yo/YoLessonDraftProvider";
import {
  YoChoiceCard,
  YoFixedFlashcardDeck,
  YoGoodAvoidGame,
  YoMiniScenarioCard,
  YoOneQuestionQuiz,
  YoPairMatchGame,
} from "@/components/yo/YoInteractiveLessonPrimitives";
import { YoPrintableResourceCard } from "@/components/yo/YoPrintableResourceCard";
import { lstr, getYoLocale, t } from "@/lib/yo/localize";
import { getYoPrintableResource } from "@/lib/yo/printableResources";
import type { YoLocale } from "@/lib/yo/types";

export const metadata: Metadata = {
  title: "Poser une question sans bloquer | YoPratiqo",
  description:
    "Leçon interactive YoPratiqo pour apprendre à amorcer une question courte, reformuler et pratiquer avec un professeur Pratiqo.",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ lang?: string | string[] }>;
};

const LESSON_TITLE = "Poser une question sans bloquer";
const MODULE_TITLE = "Français québécois au travail";
const TEACHER_HREF = "/trouver-un-prof?q=francais";
const KIT_HREF = "/yo/langues/francais-quebec/module-1/lecon-3/kit-de-survie";

function langSuffix(locale: YoLocale): string {
  if (locale === "fr") return "";
  return locale === "es" ? "?lang=es" : "?lang=en";
}

function teacherHref(locale: YoLocale): string {
  if (locale === "fr") return TEACHER_HREF;
  return `${TEACHER_HREF}&lang=${locale}`;
}

const feedback = {
  blocked: "Essaie court. Yoppo t’aide à ouvrir sans bloquer.",
  good: "Bonne amorce.",
  direct: "Trop direct.",
  reformulate: "Essaie de reformuler.",
  rhythm: "Parfait — court, clair, naturel.",
};

function LessonCard({
  eyebrow,
  title,
  children,
  state = "map",
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  state?: "confused" | "map" | "teacher_ready" | "celebrating" | "badge_unlocked";
}) {
  return (
    <section
      data-yo-lesson3-screen-card="true"
      className="flex max-w-full flex-col gap-4 overflow-x-hidden rounded-[32px] border border-[#E7DFCF] bg-white/92 p-4 shadow-[0_18px_48px_rgba(15,58,52,0.10)] sm:p-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <CompanionAvatar state={state} locale="fr" size="sm" />
        <div className="min-w-0">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#1D9E75]">{eyebrow}</p>
          <h1 className="mt-1 text-[clamp(1.55rem,6vw,2.15rem)] font-black leading-[1.05] tracking-tight text-[#0F6E56]">
            {title}
          </h1>
        </div>
      </div>
      {children}
    </section>
  );
}

function YoppoNote({
  children,
  state = "map",
}: {
  children: React.ReactNode;
  state?: "confused" | "map" | "teacher_ready" | "celebrating" | "badge_unlocked";
}) {
  return (
    <div data-yo-yoppo-feedback="true" className="flex items-start gap-3 rounded-3xl border border-[#D8ECE6] bg-[#DDF4F1] p-3 text-sm font-bold leading-snug text-[#0F6E56]">
      <CompanionAvatar state={state} locale="fr" size="xs" compact />
      <p>{children}</p>
    </div>
  );
}

const openerChoices = [
  { id: "a", label: "Hé!" },
  { id: "b", label: "Aurais-tu deux minutes? J’aurais une question." },
  {
    id: "c",
    label: "Désolé de vous déranger, je suis nouveau ici et je voulais peut-être…",
    helper: "Trop long pour une ouverture A1.",
  },
] as const;

const pairItems = [
  { id: "pass", left: "Excuse-moi, j’aurais une petite question.", right: "passe-partout" },
  { id: "busy", left: "Aurais-tu deux minutes?", right: "personne occupée" },
  { id: "quick", left: "Vite de même…", right: "collègue informel" },
  { id: "respect", left: "Je veux pas te déranger, mais…", right: "respectueux" },
] as const;

const goodAvoid = [
  { id: "hey", text: "Hé!", answer: "avoid", feedback: "Trop direct." },
  { id: "toi", text: "Toi!", answer: "avoid", feedback: "Trop brusque au travail." },
  { id: "ask", text: "Je peux te poser une question?", answer: "good", feedback: "Correct et clair." },
  { id: "excuse", text: "Excuse-moi, j’aurais une petite question.", answer: "good", feedback: "Bonne amorce." },
] as const;

const questionChoices = [
  { id: "ou", label: "Où" },
  { id: "heure", label: "À quelle heure" },
  { id: "qui", label: "Qui" },
  { id: "comment", label: "Comment" },
] as const;

const flashcards = [
  { id: "fc-excuse", front: "Excuse-moi, j’aurais une petite question.", back: "A safe opener for most workplace questions." },
  { id: "fc-deux-min", front: "Aurais-tu deux minutes?", back: "Good when the person seems busy." },
  { id: "fc-vite", front: "Vite de même…", back: "Informal: quick question between coworkers." },
  { id: "fc-dispo", front: "T’es-tu disponible?", back: "Quebec-style oral question: Are you available?" },
  { id: "fc-ou", front: "Où?", back: "Where?" },
  { id: "fc-heure", front: "À quelle heure?", back: "At what time?" },
  { id: "fc-qui", front: "Qui?", back: "Who?" },
  { id: "fc-comment", front: "Comment?", back: "How?" },
  { id: "fc-mot", front: "Je cherche mon mot.", back: "I’m looking for the word." },
  { id: "fc-merci", front: "Parfait, merci!", back: "Perfect, thanks!" },
] as const;

const quizQuestions = [
  {
    id: "q1",
    prompt: "Quelle amorce est la plus naturelle avec une personne occupée?",
    options: openerChoices,
    correctOptionId: "b",
  },
  {
    id: "q2",
    prompt: "« T’es-tu disponible? » veut dire quoi?",
    options: [
      { id: "a", label: "Es-tu libre / disponible?" },
      { id: "b", label: "Tu es en retard?" },
      { id: "c", label: "Tu pars maintenant?" },
    ],
    correctOptionId: "a",
  },
  {
    id: "q3",
    prompt: "Après « Hein? », la meilleure stratégie est…",
    options: [
      { id: "a", label: "répéter plus fort" },
      { id: "b", label: "reformuler plus simple" },
      { id: "c", label: "partir" },
    ],
    correctOptionId: "b",
  },
  {
    id: "q4",
    prompt: "Version orale naturelle de « Où est la salle de pause? »",
    options: [
      { id: "a", label: "C’est où, la salle de pause?" },
      { id: "b", label: "La salle de pause est située où, monsieur?" },
      { id: "c", label: "Toi, pause?" },
    ],
    correctOptionId: "a",
  },
  {
    id: "q5",
    prompt: "La règle de rythme est…",
    options: [
      { id: "a", label: "longue justification + question" },
      { id: "b", label: "amorce + pause + question courte" },
      { id: "c", label: "question sans amorce" },
    ],
    correctOptionId: "b",
  },
] as const;

function buildSteps(locale: YoLocale) {
  const kitResource = getYoPrintableResource("fr-qc-m1-l3-survival-kit");
  return [
    {
      id: "situation",
      label: "Situation",
      companionHint: "Observe la personne avant de parler : est-elle occupée ? Prépare une seule question courte, puis laisse-lui le temps de répondre.",
      content: (
        <LessonCard eyebrow="Situation" title="Tu as une vraie question… et tu bloques." state="confused">
          <p className="text-base font-semibold leading-relaxed text-[#0F6E56]/80">
            Tu veux demander où aller, quoi faire ou comment continuer. Le but ici: ouvrir la question sans casser le rythme.
          </p>
          <YoppoNote state="confused">{feedback.blocked}</YoppoNote>
        </LessonCard>
      ),
    },
    {
      id: "mission",
      label: "Mission",
      companionHint: "Ta mission est d’ouvrir un échange au travail. Imagine une information dont tu as vraiment besoin, puis essaie une amorce polie à voix haute.",
      content: (
        <LessonCard eyebrow="Mission" title="Trois gestes à automatiser" state="map">
          <div className="grid gap-2">
            {["ouvrir une question", "poser court", "reformuler"].map((skill) => (
              <p key={skill} className="rounded-2xl bg-[#F8FCFB] px-4 py-3 text-sm font-black text-[#0F6E56]">
                {skill}
              </p>
            ))}
          </div>
          <YoppoNote>Yoppo te donne une mini-mission: rester clair, poli et naturel.</YoppoNote>
        </LessonCard>
      ),
    },
    {
      id: "best-opener",
      label: "Choix",
      content: (
        <LessonCard eyebrow="À toi" title="Choisis la meilleure amorce" state="confused">
          <YoChoiceCard
            draftKey="best-opener"
            prompt="Un superviseur semble occupé. Quelle amorce est la plus naturelle?"
            options={openerChoices}
            correctOptionId="b"
            correctFeedback="Bonne amorce."
            incorrectFeedback="Trop direct ou trop long. Essaie une ouverture courte."
          />
        </LessonCard>
      ),
    },
    {
      id: "opener-explained",
      label: "Pourquoi",
      companionHint: "Une amorce prépare l’échange sans raconter toute l’histoire. Par exemple, « Aurais-tu deux minutes ? » permet de vérifier si le moment convient.",
      content: (
        <LessonCard eyebrow="Mini-explication" title="Pourquoi ça fonctionne" state="teacher_ready">
          <p className="text-base font-semibold leading-relaxed text-[#0F6E56]/80">
            « Aurais-tu deux minutes? » respecte le temps de l’autre. « J’aurais une question » annonce clairement ton besoin.
          </p>
          <YoppoNote state="teacher_ready">{feedback.good}</YoppoNote>
        </LessonCard>
      ),
    },
    {
      id: "matching",
      label: "Paires",
      content: (
        <LessonCard eyebrow="Paires" title="Amorce → contexte" state="map">
          <YoPairMatchGame title="Associe chaque amorce à son usage naturel." items={pairItems} feedback="Ces amorces couvrent quatre contextes fréquents au travail." />
        </LessonCard>
      ),
    },
    {
      id: "good-avoid",
      label: "Bon ou évite",
      content: (
        <LessonCard eyebrow="Réflexe" title="Bon / à éviter" state="confused">
          <YoGoodAvoidGame draftKey="good-avoid" title="Tape le bon réflexe pour chaque phrase." items={goodAvoid} goodLabel="Bon" avoidLabel="À éviter" />
        </LessonCard>
      ),
    },
    {
      id: "question-word",
      label: "Mot-question",
      content: (
        <LessonCard eyebrow="Question courte" title="Tu cherches la salle de pause" state="map">
          <YoChoiceCard
            draftKey="question-word"
            prompt="Quel mot-question ouvre la phrase?"
            options={questionChoices}
            correctOptionId="ou"
            correctFeedback="Parfait — C’est où, la salle de pause?"
            incorrectFeedback="Essaie le mot qui demande un lieu."
          />
        </LessonCard>
      ),
    },
    {
      id: "question-words",
      label: "Repères",
      content: (
        <LessonCard eyebrow="Essentiels" title="Quatre mots-questions" state="teacher_ready">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {["Où?", "À quelle heure?", "Qui?", "Comment?"].map((word) => (
              <p key={word} className="rounded-2xl border border-[#D8ECE6] bg-[#F8FCFB] px-4 py-5 text-center text-xl font-black text-[#0F6E56]" lang="fr-CA">
                {word}
              </p>
            ))}
          </div>
        </LessonCard>
      ),
    },
    {
      id: "oral-quebec",
      label: "Oral",
      content: (
        <LessonCard eyebrow="Oral québécois" title="La structure « C’est… »" state="map">
          <YoChoiceCard
            draftKey="oral-quebec"
            prompt="Quelle phrase sonne naturelle à l’oral?"
            options={[
              { id: "a", label: "C’est où, la salle de pause?" },
              { id: "b", label: "Où est située officiellement la salle de pause?" },
              { id: "c", label: "Salle pause où?" },
            ]}
            correctOptionId="a"
            correctFeedback="Parfait — oral, court, clair."
            incorrectFeedback="Essaie la version orale courte."
          />
        </LessonCard>
      ),
    },
    {
      id: "hein",
      label: "Hein?",
      content: (
        <LessonCard eyebrow="Scène" title="Quand l’autre dit « Hein? »" state="confused">
          <YoChoiceCard
            draftKey="hein"
            prompt="Tu demandes vite. La personne répond « Hein? ». Tu fais quoi?"
            options={[
              { id: "a", label: "Je répète plus fort." },
              { id: "b", label: "Je reformule plus simple." },
              { id: "c", label: "Je laisse tomber." },
            ]}
            correctOptionId="b"
            correctFeedback="Essaie de reformuler."
            incorrectFeedback="Le volume ne règle pas toujours le rythme."
          />
        </LessonCard>
      ),
    },
    {
      id: "reformulate",
      label: "Reformuler",
      content: (
        <LessonCard eyebrow="Paires" title="Original → plus simple" state="teacher_ready">
          <YoPairMatchGame
            title="Observe comment la deuxième phrase enlève le blocage."
            items={[
              { id: "r1", left: "C’est à quelle heure, la réunion?", right: "La réunion, c’est quand?" },
              { id: "r2", left: "Comment je fais pour scanner?", right: "Je veux scanner. Comment je fais?" },
              { id: "r3", left: "C’est où?", right: "La salle de pause, je la cherche. C’est où?" },
            ]}
            feedback="La reformulation garde l’idée, mais réduit la charge."
          />
        </LessonCard>
      ),
    },
    {
      id: "rhythm",
      label: "Rythme",
      content: (
        <LessonCard eyebrow="Rythme" title="Amorce → pause → question" state="teacher_ready">
          <div data-yo-rhythm-practice="true" className="grid gap-2">
            {["Excuse-moi", "petite pause", "j’aurais une question", "question courte"].map((part, index) => (
              <p key={part} className="rounded-2xl bg-[#DDF4F1] px-4 py-3 text-sm font-black text-[#0F6E56]">
                {index + 1}. {part}
              </p>
            ))}
          </div>
          <YoppoNote state="celebrating">{feedback.rhythm}</YoppoNote>
        </LessonCard>
      ),
    },
    {
      id: "mini-scenario",
      label: "Scénario",
      content: (
        <LessonCard eyebrow="Mini-scénario" title="Répondre après « Hein? »" state="confused">
          <YoMiniScenarioCard
            lines={[
              { speaker: "Vous", text: "Aurais-tu deux minutes? J’aurais une question." },
              { speaker: "Collègue", text: "Hein?" },
              { speaker: "Vous", text: "La salle de pause, je la cherche. C’est où?" },
            ]}
            prompt="La réponse reformule plus simple, sans panique."
          />
        </LessonCard>
      ),
    },
    {
      id: "flashcards",
      label: "Flashcards",
      content: (
        <LessonCard eyebrow="Flashcards fixes" title="Une carte à la fois" state="map">
          <YoFixedFlashcardDeck draftKey="flashcards" cards={flashcards} flipLabel="Retourner" previousLabel="Précédent" nextLabel="Suivant" />
        </LessonCard>
      ),
    },
    {
      id: "quiz",
      label: "Quiz",
      content: (
        <LessonCard eyebrow="Quiz" title="Cinq vérifications courtes" state="teacher_ready">
          <YoOneQuestionQuiz
            draftKey="quiz"
            questions={quizQuestions}
            correctFeedback="Correct."
            incorrectFeedback="Réessaie avec une phrase plus naturelle."
            previousLabel="Précédent"
            nextLabel="Suivant"
          />
        </LessonCard>
      ),
    },
    {
      id: "final-challenge",
      label: "Défi",
      content: (
        <LessonCard eyebrow="Défi final" title="Pose ta question en 6–8 secondes" state="celebrating">
          <div className="rounded-[24px] bg-[#FFF4D6] p-4 text-[#5a3f0f]">
            <p className="text-lg font-black">Amorce + pause + question courte</p>
            <p className="mt-2 text-sm font-semibold">Exemple: « Excuse-moi… j’aurais une petite question. C’est où, la salle de pause? »</p>
          </div>
          <YoppoNote state="celebrating">Parfait — court, clair, naturel.</YoppoNote>
        </LessonCard>
      ),
    },
    {
      id: "summary",
      label: "Résumé",
      companionHint: "Rejoue la même situation avec un autre collègue : une amorce, une pause, puis ta question. Change l’information demandée pour ne pas seulement réciter.",
      content: (
        <LessonCard eyebrow="Résumé" title="Ce que tu sais faire maintenant" state="badge_unlocked">
          <div className="grid gap-2">
            {["amorcer", "poser court", "reformuler"].map((item) => (
              <p key={item} className="flex items-center gap-2 rounded-2xl bg-[#F8FCFB] px-4 py-3 text-sm font-black text-[#0F6E56]">
                <CheckCircle2 className="size-4 text-[#1D9E75]" aria-hidden />
                {item}
              </p>
            ))}
          </div>
        </LessonCard>
      ),
    },
    {
      id: "teacher-kit",
      label: "Prof + kit",
      content: (
        <LessonCard eyebrow="Prochaine pratique" title="Pratique avec un prof Pratiqo" state="teacher_ready">
          <p className="text-base font-bold leading-relaxed text-[#0F6E56]/82">
            YoPratiqo te prépare. Un vrai prof t’aide à rendre le rythme naturel.
          </p>
          <div className="rounded-[24px] border border-[#D8ECE6] bg-[#F8FCFB] p-4">
            <p className="font-black text-[#0F6E56]">Demandez à votre prof de simuler trois situations :</p>
            <ol className="mt-2 grid gap-1 text-sm font-semibold leading-snug text-[#0F6E56]/80">
              <li>1. poser une question simple;</li>
              <li>2. reformuler après un “hein?”;</li>
              <li>3. corriger votre rythme et votre intonation.</li>
            </ol>
            <p className="mt-3 text-sm font-bold text-[#0F6E56]">Objectif : poser une question claire en 6 à 8 secondes, sans bloquer.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#0F6E56] px-5 text-sm font-extrabold text-white" href={teacherHref(locale)}>
              <MessageCircle className="size-4" aria-hidden />
              Trouver mon prof de français québécois
            </Link>
            {kitResource ? (
              <YoPrintableResourceCard
                resource={{ ...kitResource, href: `${KIT_HREF}${langSuffix(locale)}` }}
                locale={locale}
                body={t(lstr("Ouvre le Kit de survie Pratiqo dans une page propre à imprimer.", "Open the Pratiqo survival kit in a clean printable page.", "Abre el kit de supervivencia Pratiqo en una página limpia para imprimir."), locale)}
              />
            ) : null}
          </div>
        </LessonCard>
      ),
    },
  ];
}

function RailCard({ children }: { children: React.ReactNode }) {
  return (
    <aside className="rounded-[28px] border border-[#E7DFCF] bg-white/86 p-4 shadow-[0_14px_38px_rgba(15,58,52,0.08)]">
      {children}
    </aside>
  );
}

export default async function FrenchQuebecLesson3Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const locale = getYoLocale(params.lang);
  const suffix = langSuffix(locale);
  const moduleHref = `/yo/langues/francais-quebec/module-1${suffix}`;
  const steps = buildSteps(locale);
  const headerTitle = LESSON_TITLE;
  const header = (
    <YoAppHeader
      locale={locale}
      backHref={moduleHref}
      backLabel="Module 1"
      title={headerTitle}
      compactTitle="Leçon 3"
      selectorPath="/yo/langues/francais-quebec/module-1/lecon-3"
      surfaceId="fr-qc-lesson3"
    />
  );

  const lesson = (
    <YoAdaptiveStepShell
      surfaceId="fr-qc-lesson3-interactive"
      mobile={{
        header,
        steps,
        locale,
        companion: true,
        stepsAriaLabel: "Leçon 3 interactive YoPratiqo",
        rootBackHref: moduleHref,
        rootBackLabel: "Module 1",
      }}
      desktop={{
        header,
        center: (
          <div className="min-w-0 overflow-x-hidden">
            <div className="mb-3 rounded-full border border-[#D8ECE6] bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#0F6E56]/70">
              {MODULE_TITLE} · Leçon 3
            </div>
            <div data-yo-desktop-controlled-step-model="true">
              <YoStepNavigator
                steps={steps}
                surfaceId="fr-qc-lesson3-desktop"
                locale={locale}
                ariaLabel="Leçon 3 interactive YoPratiqo"
                variant="embedded"
                companion
                rootBackHref={moduleHref}
                rootBackLabel="Module 1"
              />
            </div>
          </div>
        ),
        leftRail: (
          <RailCard>
            <CompanionAvatar state="teacher_ready" locale={locale} size="md" />
            <p className="mt-3 text-lg font-black text-[#0F6E56]">Yoppo</p>
            <p className="mt-1 text-sm font-semibold leading-relaxed text-[#0F6E56]/75">
              Objectif: amorce, question courte, reformulation.
            </p>
          </RailCard>
        ),
        rightRail: (
          <RailCard>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#1D9E75]">Progression</p>
            <ol className="mt-3 grid gap-2 text-sm font-semibold text-[#0F6E56]/78">
              <li>1. Amorcer</li>
              <li>2. Questionner</li>
              <li>3. Reformuler</li>
              <li>4. Pratiquer avec un prof</li>
            </ol>
          </RailCard>
        ),
        centerMaxWidth: "3xl",
      }}
    />
  );
  return <YoLessonDraftProvider>{lesson}</YoLessonDraftProvider>;
}
