import type { Locale } from "@/lib/i18n/types";
import type { BlogLocaleBundle } from "./types";

/** Phase 2 supply-side articles: EN + ES locale bundles (FR source in DB). */
export const SUPPLY_PHASE2_LOCALE_OVERRIDES: Partial<
  Record<string, Partial<Record<Locale, BlogLocaleBundle>>>
> = {
  "emplois-temps-partiel-bien-payes-etudiants-universitaires": {
    en: {
      title: "Best High-Paying Part-Time Jobs for University Students",
      excerpt:
        "Flexible part-time options that can pay well for students in Canada — with realistic expectations about hours, skills, and demand.",
      keyTakeaways: [
        "Private tutoring can become a flexible side activity when you have strong subject skills and clear availability.",
        "Earnings vary widely by subject, level, format, and how consistently you can teach.",
        "Marketplaces like Pratiqo help you look professional fast — profile quality and response time matter.",
      ],
      faq: [
        {
          question: "Is tutoring actually a good part-time job for students?",
          answer:
            "It can be, if you enjoy explaining concepts and can commit to a predictable weekly schedule. Demand depends on your subjects and location or online reach.",
        },
        {
          question: "Do I need formal certifications to start?",
          answer:
            "Not always. Many families look for clear expertise, communication, and proof of results. Certifications help for some subjects, but they are not the only path.",
        },
        {
          question: "How much can I earn?",
          answer:
            "There is no universal number. Rates depend on the subject, level, experience, and whether lessons are online or in person. Compare similar profiles and adjust as you gain reviews.",
        },
      ],
      contentMarkdown: `University schedules change every semester — so the best student jobs are usually the ones you can scale up or down without burning out. Private tutoring is one of the few part-time paths that can reward depth: if you are strong in a subject, you can help others while keeping hours relatively flexible.

## Why tutoring fits many students

You already study the material, you understand exam pressure, and you can often teach the “student-to-student” explanations that land faster than textbook jargon. Tutoring can become a flexible side activity that may help you earn supplemental income, depending on your availability, your rates, and local demand.

## Other flexible options to compare (realistically)

Campus roles, research assistantships, and seasonal internships can be great — but they are not always available year-round. Some students combine tutoring with another part-time job so income does not depend on a single employer.

## What makes a tutoring profile credible

Families look for clarity: what levels you teach, how you structure a first lesson, and how you communicate cancellations and homework expectations. Strong profiles also show verification where possible and keep messaging professional.

## Getting started without overpromising

Start with subjects you truly know, set a schedule you can sustain during midterms, and adjust your rate after you understand the market. If you want a simple path to present yourself professionally, you can create a teacher profile and connect with people already searching for help.

[Become a teacher →](/become-teacher)

## Learn more about pricing and platform basics

- [How much should you charge for a private lesson in Quebec? →](/blog/combien-charger-cours-prive-quebec)
- [Teacher plans and marketplace context →](/tarifs)
- [More guides for people who teach →](/blog)`,
    },
    es: {
      title: "Trabajos part-time bien pagos para estudiantes universitarios",
      excerpt:
        "Opciones flexibles para estudiantes en América del Norte: tutorías y trabajos complementarios, con expectativas realistas.",
      keyTakeaways: [
        "Dar clases particulares puede ser una actividad flexible si dominás una materia y podés cumplir horarios claros.",
        "Lo que ganás depende de la materia, el nivel, el formato y la demanda.",
        "Un perfil claro y respuestas rápidas ayudan más que prometer resultados imposibles.",
      ],
      faq: [
        {
          question: "¿Las clases particulares son un buen part-time para estudiantes?",
          answer:
            "Puede serlo si te gusta explicar y podés sostener una rutina semanal. La demanda depende de la materia y si das clase online o presencial.",
        },
        {
          question: "¿Necesito certificaciones formales?",
          answer:
            "No siempre. Muchas familias priorizan dominio real, comunicación clara y señales de confianza en el perfil.",
        },
        {
          question: "¿Cuánto se puede ganar?",
          answer:
            "No hay una cifra universal: varía según materia, nivel y experiencia. Mirá perfiles parecidos y ajustá con el tiempo.",
        },
      ],
      contentMarkdown: `La universidad cambia el ritmo cada cuatrimestre, por eso conviene buscar trabajos que puedas subir o bajar de intensidad sin quemarte. Las clases particulares son una de las pocas vías donde te pagan por algo que ya estás estudiando: si dominás una materia, podés ayudar a otros con horarios relativamente flexibles.

## Por qué encajan con muchos estudiantes

Entendés la presión de parciales y finales, y a veces explicás mejor “de igual a igual” que un manual. Dar clases puede ser una actividad flexible que ayuda a generar un ingreso extra según tu disponibilidad, tus tarifas y la demanda.

## Otras opciones para combinar

Trabajos en campus, ayudantías o prácticas puntuales también sirven, pero no siempre están todo el año. Mucha gente combina tutorías con otro part-time para no depender de una sola fuente.

## Perfil creíble = menos fricción

Aclará niveles, cómo es la primera clase y cómo manejás cancelaciones. Un tono profesional y respuestas rápidas marcan la diferencia.

## Empezá sin prometer de más

Enfocate en lo que realmente sabés, armá una agenda sostenible en época de exámenes y ajustá el precio cuando entiendas el mercado.

[Dar clases con Pratiqo →](/become-teacher)

## Más lectura

- [Cuánto cobrar por una clase particular en Québec →](/blog/combien-charger-cours-prive-quebec)
- [Planes y contexto →](/tarifs)
- [Guías para quienes enseñan →](/blog)`,
    },
  },

  "donner-cours-prives-side-hustle-etudiants": {
    en: {
      title: "Private Tutoring: A Flexible Side Hustle for Students",
      excerpt:
        "How private lessons can fit a student schedule — building skills, credibility, and supplemental income without guaranteed outcomes.",
      keyTakeaways: [
        "Tutoring is flexible, but reliability is non-negotiable: show up prepared and communicate early.",
        "Income depends on subject demand, your rate, and how many stable weekly slots you keep.",
        "A marketplace profile helps you look legitimate quickly while you learn how to teach professionally.",
      ],
      faq: [
        {
          question: "Is private tutoring a “passive” side hustle?",
          answer:
            "No. It is flexible, but it still requires preparation, messaging, and consistent quality. The upside is control over many of your hours.",
        },
        {
          question: "What subjects are easiest to start with?",
          answer:
            "Start where you have the strongest grasp — often secondary-level math, sciences, French/English writing, or introductory university courses.",
        },
        {
          question: "How do I find students safely?",
          answer:
            "Prefer platforms that clarify policies, verification options, and booking flows. Avoid vague arrangements with incomplete information.",
        },
      ],
      contentMarkdown: `A side hustle should fit around lectures, labs, and exam season — not replace them. Private tutoring can work well because sessions are often short, repeatable, and scheduled in advance. It can become a flexible activity that may help you earn supplemental income, depending on your availability, pricing, and demand.

## What tutoring teaches you (beyond money)

You practice communication, patience, and breaking problems into steps — skills that transfer to almost any career. Even a small roster of weekly students can sharpen your professional habits.

## The realistic constraints

You need buffers for midterms, reliable internet for online lessons, and clear cancellation rules. Students and families choose tutors who are predictable.

## Pricing without magical thinking

Benchmark similar tutors, then adjust for your experience. Early on, competitive pricing can help you gain reviews — but do not race to the bottom if it makes the work unsustainable.

## Where Pratiqo helps

You can publish a structured profile, clarify what you teach, and connect with people already searching for lessons.

[Become a teacher →](/become-teacher)

## Related reading

- [Best part-time options for university students →](/blog/emplois-temps-partiel-bien-payes-etudiants-universitaires)
- [How much should you charge? →](/blog/combien-charger-cours-prive-quebec)
- [Teacher plans →](/tarifs)
- [Blog hub →](/blog)`,
    },
    es: {
      title: "Dar clases particulares: un side hustle flexible para estudiantes",
      excerpt:
        "Cómo encajar clases privadas en la vida universitaria, con foco en flexibilidad, responsabilidad y ingresos variables.",
      keyTakeaways: [
        "Es flexible, pero no es pasivo: preparación y puntualidad definen tu reputación.",
        "Los ingresos dependen de materia, tarifa y cuántos cupos semanales sostenés.",
        "Un perfil en marketplace acelera la confianza inicial.",
      ],
      faq: [
        {
          question: "¿Es un ingreso pasivo?",
          answer:
            "No. Tenés que preparar clases, responder mensajes y mantener calidad. Sí suele ser flexible en horarios.",
        },
        {
          question: "¿Con qué materia arranco?",
          answer:
            "Con la que mejor domines: matemática, ciencias, idiomas o apoyo introductorio universitario suelen tener demanda.",
        },
        {
          question: "¿Cómo encuentro alumnos con más seguridad?",
          answer:
            "Usá plataformas con reservas claras y opciones de verificación; evitá acuerdos vagos.",
        },
      ],
      contentMarkdown: `Un side hustle tiene que convivir con cursadas y finales. Las clases particulares suelen funcionar porque son bloques cortos y repetibles. Puede ser una actividad flexible que ayuda a generar un ingreso extra según disponibilidad, tarifas y demanda.

## Qué aprendés además del dinero

Explicar bien, escuchar y dividir problemas en pasos: eso sirve para cualquier carrera.

## Límites reales

Reservá margen para parciales, definí reglas de cancelación y cuidá la conexión si das online.

## Precios sin fantasía

Mirá tutores parecidos y ajustá por experiencia. Al principio un precio razonable puede ayudar a conseguir reseñas, pero no lo bajes tanto que no sea sostenible.

## Pratiqo como canal

Podés publicar qué enseñás y conectar con gente que ya busca clases.

[Dar clases con Pratiqo →](/become-teacher)

## Lecturas relacionadas

- [Trabajos part-time para universitarios →](/blog/emplois-temps-partiel-bien-payes-etudiants-universitaires)
- [Cuánto cobrar →](/blog/combien-charger-cours-prive-quebec)
- [Planes →](/tarifs)
- [Blog →](/blog)`,
    },
  },

  "gagner-argent-musique-piano-guitare-chant": {
    en: {
      title: "How to Make Money With Music: Piano, Guitar, and Singing",
      excerpt:
        "Teaching music responsibly in Canada: building students, setting expectations, and growing income without promising fame or fixed paychecks.",
      keyTakeaways: [
        "Teaching lessons is the most common stable path — performance income is separate and less predictable.",
        "Beginners need structure: technique, practice routines, and safe vocal habits.",
        "Your profile should clarify level, style, and whether you teach online, in-home, or in-studio.",
      ],
      faq: [
        {
          question: "Do I need a music degree to teach beginners?",
          answer:
            "Not always, but you should be honest about your training. Parents often look for clear experience, method, and safety for children.",
        },
        {
          question: "Are music lessons online viable?",
          answer:
            "Yes for many instruments with good audio and camera placement. Some topics are easier in person — be transparent about limitations.",
        },
        {
          question: "Can I guarantee income from teaching music?",
          answer:
            "No ethical marketplace should promise that. Income depends on demand, your rate, and how consistently you teach.",
        },
      ],
      contentMarkdown: `If you play piano, guitar, or sing, you already know music is rarely “one income stream.” Teaching private lessons is often the most straightforward way to turn skill into paid work you can schedule — it can help you earn supplemental income depending on your availability, rates, and local demand.

## Teaching vs. performing

Gigs can be exciting, but they fluctuate. Lessons are usually booked weekly, which makes planning easier for students — and for you.

## What families want to see

Clear information about method books, practice expectations, recitals (if any), and how you handle young beginners. For voice, conservative warm-up guidance and age-appropriate repertoire matter.

## Pricing music fairly

Instrument lessons often price differently than generic homework help. Compare teachers with similar training and genre focus.

## Build your teaching presence

A strong profile with video samples (when possible), policies, and level tags helps you stand out without overpromising results.

[Become a teacher →](/become-teacher)

## Related guides

- [Private tutoring as a student side hustle →](/blog/donner-cours-prives-side-hustle-etudiants)
- [How much to charge →](/blog/combien-charger-cours-prive-quebec)
- [Plans →](/tarifs)
- [Blog →](/blog)`,
    },
    es: {
      title: "Cómo ganar dinero con la música: piano, guitarra y canto",
      excerpt:
        "Enseñar música con criterio: armar alumnos, expectativas claras y crecimiento sin promesas irreales.",
      keyTakeaways: [
        "Dar clases suele ser más estable que depender solo de toques eventuales.",
        "Los principiantes necesitan método, práctica en casa y hábitos seguros (especialmente en canto).",
        "Tu perfil debe decir nivel, estilo y modalidad (online/presencial).",
      ],
      faq: [
        {
          question: "¿Hace falta título para enseñar principiantes?",
          answer:
            "No siempre, pero sé transparente con tu formación. En niños, la confianza y la claridad importan mucho.",
        },
        {
          question: "¿Sirve el online?",
          answer:
            "Sí para varios instrumentos con buen audio. En algunos casos el presencial ayuda más: decilo con honestidad.",
        },
        {
          question: "¿Hay ingreso asegurado?",
          answer:
            "No: depende de demanda, tarifas y constancia.",
        },
      ],
      contentMarkdown: `Tocar o cantar no suele ser un solo ingreso. Dar clases particulares es una forma común de organizar el tiempo y monetizar tu oficio: puede ayudar a generar un ingreso extra según disponibilidad, tarifas y demanda.

## Enseñar vs. tocar en eventos

Los eventos fluctúan; las clases semanales dan más previsibilidad.

## Qué buscan las familias

Método, práctica entre clases y criterio con menores. En canto, calentamiento prudente y repertorio adecuado.

## Precios

Compará con profes con formación y estilo similares.

## Perfil profesional

Videos cortos y políticas claras ayudan sin prometer “resultados mágicos”.

[Dar clases con Pratiqo →](/become-teacher)

## Más guías

- [Side hustle estudiantil →](/blog/donner-cours-prives-side-hustle-etudiants)
- [Cuánto cobrar →](/blog/combien-charger-cours-prive-quebec)
- [Planes →](/tarifs)
- [Blog →](/blog)`,
    },
  },

  "gagner-argent-avec-les-langues": {
    en: {
      title: "How to Make Money With Languages",
      excerpt:
        "Conversation coaching, structured lessons, and exam support — how language teaching works as flexible work in Canada, with responsible income expectations.",
      keyTakeaways: [
        "Decide whether you teach conversation, school support, or test prep — each needs different materials.",
        "Bilingualism is not enough alone; lesson structure and feedback matter.",
        "Rates vary widely by language pair and learner goals.",
      ],
      faq: [
        {
          question: "Do I need to be a native speaker?",
          answer:
            "Not always. Many learners want structured lessons from teachers who can explain grammar clearly and adapt to their level.",
        },
        {
          question: "Is online language teaching viable?",
          answer:
            "Yes — especially for conversation and homework support. Good audio matters more than fancy backgrounds.",
        },
        {
          question: "Can I promise fluency timelines?",
          answer:
            "Avoid rigid promises. Progress depends on learner practice time, level, and consistency.",
        },
      ],
      contentMarkdown: `Languages are in demand for immigration, school, travel, and careers — but “speaking two languages” is only the starting point. Private students usually want a plan: weekly goals, corrections, and homework that fits their life. Teaching languages can become a flexible activity that may help you earn supplemental income, depending on your availability, rates, and niche.

## Pick a lane

Conversation practice, curriculum-aligned school support, and standardized test prep use different materials. Narrow positioning helps students understand what they are buying.

## Professional habits

Be on time, take notes, and summarize each lesson. Small touches build retention — students rebook tutors who make progress visible.

## Set honest expectations

Language learning takes time. You can motivate without guaranteeing outcomes.

## Start on a trusted channel

A marketplace profile helps you clarify your language pairs, levels, and format.

[Become a teacher →](/become-teacher)

## Pair with these guides

- [Teaching French or English flexibly →](/blog/donner-cours-francais-anglais-activite-flexible)
- [Freelancing and private lessons in Quebec →](/blog/freelance-quebec-cours-prives-bonne-option)
- [Plans →](/tarifs)
- [Blog →](/blog)`,
    },
    es: {
      title: "Cómo ganar dinero con los idiomas",
      excerpt:
        "Conversación, apoyo escolar o preparación de exámenes: cómo enseñar idiomas con seriedad y flexibilidad.",
      keyTakeaways: [
        "Definí si das conversación, refuerzo escolar o preparación de exámenes.",
        "Hablar dos idiomas no alcanza: estructura y devolución clara marcan la diferencia.",
        "Las tarifas cambian según par de idiomas y objetivo del alumno.",
      ],
      faq: [
        {
          question: "¿Tengo que ser nativo?",
          answer:
            "No siempre: mucha gente busca alguien que explique gramática y organice la clase con claridad.",
        },
        {
          question: "¿Online funciona?",
          answer:
            "Sí, sobre todo para conversación y tareas. Un buen audio importa más que el fondo virtual.",
        },
        {
          question: "¿Puedo prometer fluidez en X meses?",
          answer:
            "Mejor evitar promesas rígidas: depende de práctica y constancia del alumno.",
        },
      ],
      contentMarkdown: `Hay demanda de idiomas por estudios, trabajo y migración, pero “saber el idioma” es solo el inicio. Los alumnos suelen querer un plan semanal y correcciones concretas. Enseñar idiomas puede ser una actividad flexible que ayuda a generar un ingreso extra según disponibilidad, tarifas y nicho.

## Elegí un foco

Conversación, apoyo escolar o exámenes requieren materiales distintos. Cuanto más claro el oferta, mejor.

## Profesionalismo simple

Puntualidad, notas breves y resumen al final: eso fideliza.

## Expectativas honestas

Motivá sin garantizar resultados mágicos.

## Empezá con un perfil claro

Decí pares de idiomas, niveles y formato.

[Dar clases con Pratiqo →](/become-teacher)

## Guías relacionadas

- [Francés o inglés como actividad flexible →](/blog/donner-cours-francais-anglais-activite-flexible)
- [Freelance y clases en Québec →](/blog/freelance-quebec-cours-prives-bonne-option)
- [Planes →](/tarifs)
- [Blog →](/blog)`,
    },
  },

  "etudiant-enseignement-trouver-premiers-eleves": {
    en: {
      title: "Education Student: How to Find Your First Students",
      excerpt:
        "Practical steps for future teachers: supervised experience, ethical outreach, and building a profile that earns trust.",
      keyTakeaways: [
        "Start with people you can help safely: peers, study groups, and referrals — always follow program rules on practicum.",
        "Your first students come faster when your offer is specific (grade + subject + format).",
        "Reviews take time — communicate proactively while you build a track record.",
      ],
      faq: [
        {
          question: "Can I tutor while completing a B.Ed. program?",
          answer:
            "Often yes for private tutoring, but follow your institution’s policies and any requirements around working with minors.",
        },
        {
          question: "Should I work for free at the start?",
          answer:
            "Discounted intro lessons can be ethical, but avoid indefinite unpaid labor. Set boundaries from day one.",
        },
        {
          question: "How do I prove I can teach without many reviews yet?",
          answer:
            "Use a clear bio, sample lesson outline, and professional policies. Verification options also help families feel comfortable.",
        },
      ],
      contentMarkdown: `If you are studying education, you are building classroom skills — but private tutoring is a different client relationship: faster feedback loops, more messaging, and clearer outcomes. Finding your first students is less about “marketing genius” and more about clarity, trust, and consistency.

## Start narrow

“Secondary math, grades 9–10, online or in-person in [area]” converts better than “I tutor everything.” Families scan quickly.

## Ethical outreach

Ask professors, student associations, and community groups for permitted channels. Respect privacy and child safety norms always.

## Lesson zero

Use the first session to diagnose gaps, set goals, and agree on homework time. Write a short recap for parents when relevant.

## Use a platform to look established early

Even without a long résumé, a structured profile signals professionalism.

[Become a teacher →](/become-teacher)

## Related reading

- [Private tutoring side hustle for students →](/blog/donner-cours-prives-side-hustle-etudiants)
- [How to create a teacher profile →](/blog/creer-profil-professeur-attirer-eleves)
- [Blog →](/blog)`,
    },
    es: {
      title: "Estudiante de educación: cómo encontrar tus primeros alumnos",
      excerpt:
        "Pasos prácticos para futuros docentes: experiencia supervisada, alcance ético y perfil que genera confianza.",
      keyTakeaways: [
        "Ofrecé algo específico: nivel + materia + modalidad.",
        "Respetá normas del programa y cuidado con menores.",
        "Las reseñas tardan: comunicación clara mientras construís historial.",
      ],
      faq: [
        {
          question: "¿Puedo dar clases mientras estudio educación?",
          answer:
            "A veces sí, pero revisá políticas de tu institución y requisitos para trabajar con menores.",
        },
        {
          question: "¿Arranco gratis?",
          answer:
            "Una intro con descuento puede servir, pero no prolongues trabajo sin pago sin límites claros.",
        },
        {
          question: "¿Cómo demuestro experiencia sin reseñas?",
          answer:
            "Biografía concreta, plan de primera clase y políticas profesionales. La verificación también ayuda.",
        },
      ],
      contentMarkdown: `Estudiar educación te prepara para el aula, pero las clases particulares son relación directa con familia o alumno: más mensajes, feedback rápido y metas claras. Conseguir los primeros alumnos es claridad + confianza + constancia.

## Empezá acotado

“Matemática secundaria, online/presencial en…” convierte mejor que “de todo”.

## Alcance ético

Usá canales permitidos: asociaciones, referidos, comunidad. Priorizá la seguridad infantil.

## Primera clase

Diagnosticá vacíos, acordá práctica y, si aplica, dejá un resumen breve para padres/madres.

## Perfil profesional desde el día uno

Un marketplace ordenado ayuda a compensar un CV corto.

[Dar clases con Pratiqo →](/become-teacher)

## Lecturas

- [Side hustle estudiantil →](/blog/donner-cours-prives-side-hustle-etudiants)
- [Perfil que atrae alumnos →](/blog/creer-profil-professeur-attirer-eleves)
- [Blog →](/blog)`,
    },
  },

  "professeur-retraite-enseigner-quelques-heures": {
    en: {
      title: "Retired Teacher: How to Teach a Few Hours per Week",
      excerpt:
        "Staying active after retirement with private lessons — pacing, boundaries, and income that varies with demand.",
      keyTakeaways: [
        "Start with a small weekly cap (for example a few sessions) and expand only if energy stays positive.",
        "Your experience is an advantage — clarity and patience matter as much as credentials.",
        "Check your pension and tax situation with a qualified advisor; rules are personal.",
      ],
      faq: [
        {
          question: "Will tutoring affect my pension?",
          answer:
            "It depends on your plan and total income. Speak with a qualified advisor rather than relying on general online advice.",
        },
        {
          question: "Is online teaching realistic for retirees?",
          answer:
            "Yes — many retirees teach online with basic equipment. Start simple: stable video, clear audio, and a quiet space.",
        },
        {
          question: "Can I guarantee earnings?",
          answer:
            "No. Earnings vary based on subject demand, your rate, and how many students you accept.",
        },
      ],
      contentMarkdown: `Retirement does not have to mean stopping everything at once. Many retired teachers want a few meaningful hours each week — enough to stay connected, share expertise, and optionally supplement income. Private tutoring can fit that rhythm when you set boundaries early.

## Pace yourself

Start with a modest weekly maximum. Teaching is social and cognitive work; sustainability beats maximizing hours.

## Translate school experience into private value

You already know how to plan, assess gaps, and communicate with families — highlight those strengths on your profile.

## Technology without stress

If online is new, pick one simple setup and practice once with a friend. Students forgive imperfect lighting more than unstable audio.

## Get personalized guidance on taxes and pensions

Rules differ by individual situation — ask a professional.

[Become a teacher →](/become-teacher)

## Related

- [Freelancing and private lessons in Quebec →](/blog/freelance-quebec-cours-prives-bonne-option)
- [How much to charge →](/blog/combien-charger-cours-prive-quebec)
- [Blog →](/blog)`,
    },
    es: {
      title: "Docente jubilado: cómo enseñar algunas horas por semana",
      excerpt:
        "Seguir activo con clases particulares: ritmo sostenible, límites sanos e ingresos que dependen de la demanda.",
      keyTakeaways: [
        "Empezá con pocas horas semanales y subí solo si te sentís bien.",
        "Tu experiencia escolar es una ventaja: planificación y comunicación con familia.",
        "Consultá impuestos y jubilación con un asesor calificado.",
      ],
      faq: [
        {
          question: "¿Las clases afectan mi jubilación?",
          answer:
            "Depende del régimen y tus ingresos. Pedí asesoramiento personalizado.",
        },
        {
          question: "¿El online es viable?",
          answer:
            "Sí: con audio estable y un espacio tranquilo alcanza para empezar.",
        },
        {
          question: "¿Hay ganancias aseguradas?",
          answer:
            "No: varían con demanda, tarifa y cantidad de alumnos.",
        },
      ],
      contentMarkdown: `Jubilarse no siempre significa cortar todo de golpe. Muchos docentes quieren unas horas por semana para mantener vínculo y compartir oficio. Las clases privadas pueden encajar si definís límites desde el principio.

## Ritmo sostenible

Mejor pocas sesiones estables que una agenda que agote.

## De la escuela al particular

Planificación, diagnóstico y comunicación con familia: destacalo en el perfil.

## Tecnología simple

Audio claro y una prueba con un conocido: alcanza para arrancar.

## Asesoría personal

Impuestos y pensiones no son one-size-fits-all.

[Dar clases con Pratiqo →](/become-teacher)

## Relacionado

- [Freelance y clases en Québec →](/blog/freelance-quebec-cours-prives-bonne-option)
- [Cuánto cobrar →](/blog/combien-charger-cours-prive-quebec)
- [Blog →](/blog)`,
    },
  },

  "freelance-quebec-cours-prives-bonne-option": {
    en: {
      title: "Freelancing in Quebec: Why Private Lessons Are a Good Option",
      excerpt:
        "How private tutoring compares to other freelance work in Quebec — flexibility, client acquisition, and variable income explained responsibly.",
      keyTakeaways: [
        "Private lessons can complement other freelance work because sessions repeat weekly.",
        "You still need policies: cancellations, payments, and scope of what you teach.",
        "Income varies — treat benchmarks as orientation, not promises.",
      ],
      faq: [
        {
          question: "Is tutoring “real” freelancing?",
          answer:
            "Yes — you are selling a skilled service, managing clients, and setting availability. Some people combine it with design, translation, or other freelance work.",
        },
        {
          question: "Do I need a company to start?",
          answer:
            "Not necessarily. Many tutors start as individuals and formalize accounting as they grow. Confirm details for your situation.",
        },
        {
          question: "How do I get clients without spending on ads?",
          answer:
            "Strong profiles, referrals, and fast replies often outperform ads early on.",
        },
      ],
      contentMarkdown: `Quebec’s freelance economy includes designers, developers, writers — and teachers. Private lessons are a freelance service too: you sell expertise in blocks of time, manage relationships, and adjust rates as your reputation grows. It can become a flexible activity that may help you earn supplemental income, depending on your availability, pricing, and demand.

## Why lessons pair well with other freelance work

Creative projects can be feast-or-famine. Weekly students add predictable anchors in your calendar — as long as you protect time for deep work elsewhere.

## Professionalize the basics

Write a clear cancellation policy, confirm lesson length, and keep messages respectful and prompt.

## Use a marketplace to reduce admin friction

Discovery and presentation matter. A structured profile helps you compete without building a website on day one.

[Become a teacher →](/become-teacher)

## Related reading

- [How much to charge →](/blog/combien-charger-cours-prive-quebec)
- [Create a profile that attracts students →](/blog/creer-profil-professeur-attirer-eleves)
- [Plans →](/tarifs)
- [Blog →](/blog)`,
    },
    es: {
      title: "Freelance en Quebec: por qué las clases particulares son una buena opción",
      excerpt:
        "Cómo encajan las clases privadas en una rutina freelance: flexibilidad, clientes e ingresos variables.",
      keyTakeaways: [
        "Las clases semanales dan anclas de calendario si también hacés otros trabajos freelance.",
        "Políticas claras (cancelaciones, pago, alcance) evitan fricción.",
        "Los ingresos varían: usá referencias del mercado sin prometer montos.",
      ],
      faq: [
        {
          question: "¿Cuenta como freelance?",
          answer:
            "Sí: vendés un servicio con horario, gestionás clientes y ajustás tarifas con el tiempo.",
        },
        {
          question: "¿Necesito una empresa desde el día uno?",
          answer:
            "No siempre: mucha gente empieza como persona y formaliza después. Confirmá según tu caso.",
        },
        {
          question: "¿Cómo consigo clientes sin publicidad?",
          answer:
            "Perfil sólido, referidos y respuestas rápidas suelen rendir más al inicio.",
        },
      ],
      contentMarkdown: `El freelance en Québec incluye muchas disciplinas, y enseñar también es vender tiempo y criterio. Las clases particulares pueden sumar como actividad flexible que ayuda a generar un ingreso extra según disponibilidad, tarifas y demanda.

## Por qué combina con otros trabajos

Algunos proyectos creativos van en oleadas; alumnos fijos agregan rutina si cuidás no saturarte.

## Profesionalizá lo básico

Cancelaciones, duración de clase y tono de mensajes: definilo temprano.

## Marketplace como vitrina

Un perfil ordenado reduce fricción al principio.

[Dar clases con Pratiqo →](/become-teacher)

## Más lectura

- [Cuánto cobrar →](/blog/combien-charger-cours-prive-quebec)
- [Perfil que atrae alumnos →](/blog/creer-profil-professeur-attirer-eleves)
- [Planes →](/tarifs)
- [Blog →](/blog)`,
    },
  },

  "creer-profil-professeur-attirer-eleves": {
    en: {
      title: "How to Create a Teacher Profile That Attracts Students",
      excerpt:
        "Profile checklist for tutors: clarity, proof, policies, and messaging habits that convert views into bookings.",
      keyTakeaways: [
        "Specificity beats buzzwords: grades, subjects, and lesson structure should be obvious in 10 seconds.",
        "Verification and professional photos reduce friction for families.",
        "Fast, polite replies beat perfect branding when demand is competitive.",
      ],
      faq: [
        {
          question: "How long should my bio be?",
          answer:
            "Short and structured: who you help, what you teach, how first lessons work, and what students should bring.",
        },
        {
          question: "Should I list every subject I ever studied?",
          answer:
            "No — listing too broadly can reduce trust. Teach what you can deliver excellently.",
        },
        {
          question: "Do I need a video?",
          answer:
            "Not required, but a short intro can help if you teach languages or performance subjects.",
        },
      ],
      contentMarkdown: `Your profile is not a résumé — it is a decision tool. Families and students scan quickly: they want to know if you teach their level, how lessons work, and whether you look reliable. Strong profiles reduce back-and-forth and make bookings feel safe.

## Lead with specificity

Name the levels and subjects. “Secondary science (Sec IV–V), online or in-person” beats “science tutor” alone.

## Show how lesson one works

A simple outline builds confidence: diagnostic questions, mini-lesson, homework plan.

## Policies build trust

Cancellation rules and response times are not “fine print” — they signal professionalism.

## Proof without exaggeration

Mention training honestly. Let reviews accumulate over time — do not invent testimonials.

[Become a teacher →](/become-teacher)

## Related

- [How much to charge →](/blog/combien-charger-cours-prive-quebec)
- [Freelancing and private lessons →](/blog/freelance-quebec-cours-prives-bonne-option)
- [Blog →](/blog)`,
    },
    es: {
      title: "Cómo crear un perfil de profesor que atraiga alumnos",
      excerpt:
        "Lista práctica: claridad, pruebas, políticas y mensajes que convierten visitas en reservas.",
      keyTakeaways: [
        "Especificá niveles y materias en segundos, no solo adjetivos.",
        "Foto profesional y verificación reducen fricción.",
        "Responder rápido y bien suele ganarle a un branding perfecto.",
      ],
      faq: [
        {
          question: "¿Qué tan larga va la bio?",
          answer:
            "Corta y estructurada: a quién ayudás, qué enseñás, cómo es la primera clase y qué traer.",
        },
        {
          question: "¿Listo todas las materias posibles?",
          answer:
            "Mejor no: demasiada amplitud puede bajar confianza. Ofrecé lo que podés sostener con excelencia.",
        },
        {
          question: "¿Hace falta video?",
          answer:
            "No es obligatorio; en idiomas o música puede ayudar una intro breve.",
        },
      ],
      contentMarkdown: `El perfil no es un CV: es una herramienta de decisión. La gente mira segundos: nivel, materia, modalidad y confianza. Un perfil claro reduce mensajes eternos y hace más fácil reservar.

## Primero: especificidad

Decí ciclos y materias concretas.

## Primera clase visible

Diagnóstico mini, práctica guiada y tarea razonable: eso calma.

## Políticas = profesionalismo

Cancelaciones y tiempos de respuesta importan tanto como el título.

## Prueba honesta

No inventes testimonios: las reseñas llegan con constancia.

[Dar clases con Pratiqo →](/become-teacher)

## Relacionado

- [Cuánto cobrar →](/blog/combien-charger-cours-prive-quebec)
- [Freelance y clases →](/blog/freelance-quebec-cours-prives-bonne-option)
- [Blog →](/blog)`,
    },
  },

  "combien-charger-cours-prive-quebec": {
    en: {
      title: "How Much Should You Charge for a Private Lesson in Quebec?",
      excerpt:
        "How to benchmark tutoring rates responsibly — factors that change price, and why guarantees are impossible.",
      keyTakeaways: [
        "Rates vary by subject, level, format, experience, and travel time.",
        "Compare similar profiles as orientation, then adjust for your preparation time.",
        "Low price is not a substitute for trust — clarity and consistency matter more long-term.",
      ],
      faq: [
        {
          question: "Is there a standard hourly rate?",
          answer:
            "There are common ranges, but no universal standard. Markets differ by city and subject.",
        },
        {
          question: "Should I charge the same online and in-person?",
          answer:
            "Not necessarily. In-person may include travel costs; online may compete in a wider market.",
        },
        {
          question: "Can Pratiqo guarantee a rate?",
          answer:
            "No — teachers set pricing within marketplace norms and their own strategy.",
        },
      ],
      contentMarkdown: `Pricing is the question every new teacher asks — and the honest answer is always contextual. In Quebec, private lesson rates vary widely because students are not buying “an hour” only; they are buying expertise, preparation, safety, and reliability.

## What typically moves price upward

Higher grade levels, specialized subjects, exam prep, and documented experience usually support higher rates. Travel time and materials can also matter.

## What moves price downward (without ruining trust)

Introductory promos, shorter sessions for young learners, or packaged lessons can help you build early reviews — but keep policies transparent.

## Benchmark responsibly

Use Pratiqo search to compare teachers in similar subjects. Treat what you see as orientation, not a rule.

## Adjust over time

As you gain repeat students and reviews, you can revisit pricing — slowly and with clear communication.

[Become a teacher →](/become-teacher)

[See teacher plans →](/tarifs)

## Related reading

- [Create a strong profile →](/blog/creer-profil-professeur-attirer-eleves)
- [Freelancing and private lessons →](/blog/freelance-quebec-cours-prives-bonne-option)
- [Blog →](/blog)`,
    },
    es: {
      title: "Cuánto cobrar por una clase particular en Quebec",
      excerpt:
        "Cómo calibrar tarifas con responsabilidad: factores que cambian el precio y por qué no hay garantías.",
      keyTakeaways: [
        "El precio depende de materia, nivel, formato, experiencia y desplazamiento.",
        "Compará perfiles parecidos como referencia, no como verdad absoluta.",
        "Confianza y consistencia pesan más que “el precio más bajo”.",
      ],
      faq: [
        {
          question: "¿Existe una tarifa estándar?",
          answer:
            "Hay rangos comunes, pero cambian por ciudad y materia.",
        },
        {
          question: "¿Mismo precio online y presencial?",
          answer:
            "No necesariamente: el presencial puede incluir traslado; el online compite en un mercado más amplio.",
        },
        {
          question: "¿La plataforma fija el precio?",
          answer:
            "No: cada profes define su estrategia dentro de normas generales.",
        },
      ],
      contentMarkdown: `Todo nuevo profes pregunta cuánto cobrar — y la respuesta honesta es siempre contextual. En Québec los precios varían porque el alumno compra criterio, preparación y confianza, no solo 60 minutos.

## Qué suele subir el precio

Nivel más alto, materias especializadas, preparación de exámenes y experiencia demostrable.

## Estrategias sin perder credibilidad

Intro clara con promoción puntual o paquetes cortos puede ayudar al inicio, con reglas transparentes.

## Compará con criterio

Mirá profes similares en Pratiqo como orientación.

## Ajustá con el tiempo

Cuando haya recurrencia y reseñas, podés revisar tarifas con comunicación clara.

[Dar clases con Pratiqo →](/become-teacher)

[Ver planes →](/tarifs)

## Relacionado

- [Perfil que atrae alumnos →](/blog/creer-profil-professeur-attirer-eleves)
- [Freelance y clases →](/blog/freelance-quebec-cours-prives-bonne-option)
- [Blog →](/blog)`,
    },
  },

  "donner-cours-francais-anglais-activite-flexible": {
    en: {
      title: "Teaching French or English: A Flexible and Useful Activity",
      excerpt:
        "How language teaching fits newcomers, bilinguals, and educators in Canada — with emphasis on realistic outcomes and ethical marketing.",
      keyTakeaways: [
        "Clarify whether you teach conversation, school support, or workplace communication.",
        "French and English demand exists across Canada — positioning matters as much as fluency.",
        "Flexible does not mean “always available” — set weekly limits.",
      ],
      faq: [
        {
          question: "Do I need FSL/ESL certifications?",
          answer:
            "Certifications help for some clients, but many learners need structured practice and feedback from a clear teacher.",
        },
        {
          question: "Can I teach both French and English?",
          answer:
            "If you truly can, list them separately with honest level coverage. Otherwise focus on your stronger lane.",
        },
        {
          question: "Can I promise fast progress?",
          answer:
            "Avoid rigid promises. Progress depends on learner effort between sessions.",
        },
      ],
      contentMarkdown: `French and English are practical currencies in Canada: school, work, immigration pathways, and daily life. If you can teach either language with structure, you can meet real needs — especially conversation confidence, homework support, and workplace communication. Teaching can become a flexible activity that may help you earn supplemental income, depending on your availability, rates, and niche.

## Choose a student profile

Newcomers, university students, and professionals need different lesson shapes. Say who you help best.

## Lesson design that works

Short speaking blocks, targeted corrections, and a weekly homework plan beat unstructured chatting for most learners.

## Boundaries protect quality

Decide how many evenings you teach and stick to it — burnout helps no one.

[Become a teacher →](/become-teacher)

## Related guides

- [How to make money with languages →](/blog/gagner-argent-avec-les-langues)
- [How much to charge →](/blog/combien-charger-cours-prive-quebec)
- [Blog →](/blog)`,
    },
    es: {
      title: "Dar clases de francés o inglés: una actividad flexible y útil",
      excerpt:
        "Enseñar idiomas en contexto canadiense: demanda real, diseño de clase y expectativas responsables.",
      keyTakeaways: [
        "Definí si das conversación, apoyo escolar o comunicación laboral.",
        "Francés e inglés tienen demanda: el posicionamiento importa tanto como la fluidez.",
        "Flexible no es “disponible 24/7”: poné límites semanales.",
      ],
      faq: [
        {
          question: "¿Necesito certificación FSL/ESL?",
          answer:
            "Ayuda con algunos clientes, pero mucha gente busca práctica estructurada y devolución clara.",
        },
        {
          question: "¿Puedo enseñar francés e inglés?",
          answer:
            "Si podés hacerlo bien, listalo con honestidad por niveles. Si no, enfocate en tu punto fuerte.",
        },
        {
          question: "¿Prometo progreso rápido?",
          answer:
            "Mejor evitar promesas rígidas: depende de práctica entre clases.",
        },
      ],
      contentMarkdown: `Francés e inglés mueven escuela, trabajo y vida cotidiana en Canadá. Si podés enseñar con método — conversación, tareas o comunicación profesional — encontrás demanda real. Puede ser una actividad flexible que ayuda a generar un ingreso extra según disponibilidad, tarifas y nicho.

## Elegí a quién ayudás mejor

Recién llegados, universitarios o profesionales necesitan planes distintos.

## Clases que funcionan

Bloques cortos de speaking, correcciones puntuales y tarea semanal razonable.

## Límites

Definí cuántas noches das clase y cuidate el ritmo.

[Dar clases con Pratiqo →](/become-teacher)

## Guías

- [Ganar dinero con idiomas →](/blog/gagner-argent-avec-les-langues)
- [Cuánto cobrar →](/blog/combien-charger-cours-prive-quebec)
- [Blog →](/blog)`,
    },
  },
};

export const SUPPLY_PHASE2_FR_TAKEAWAYS: Partial<Record<string, string[]>> = {
  "emplois-temps-partiel-bien-payes-etudiants-universitaires": [
    "Les cours privés peuvent devenir une activité flexible si vous maîtrisez une matière et communiquez clairement.",
    "Les revenus varient selon la matière, le niveau, le format et la demande locale ou en ligne.",
    "Comparer des profils proches sur Pratiqo aide à fixer un tarif réaliste, sans promesse de gains.",
  ],
  "donner-cours-prives-side-hustle-etudiants": [
    "C’est flexible, mais pas passif : préparation, ponctualité et messages professionnels font la différence.",
    "Commencez par les matières où vous êtes le plus solide.",
    "Un profil structuré accélère la confiance, surtout au début.",
  ],
  "gagner-argent-musique-piano-guitare-chant": [
    "Enseigner est souvent plus prévisible que dépendre uniquement des spectacles ponctuels.",
    "Soyez transparent sur le niveau, le style et le format (en ligne ou en personne).",
    "Les tarifs dépendent de la demande et de votre expérience — ils varient.",
  ],
  "gagner-argent-avec-les-langues": [
    "Précisez si vous offrez conversation, soutien scolaire ou préparation d’examens.",
    "La régularité et les devoirs entre les cours comptent autant que le cours lui-même.",
    "Évitez les promesses de délais de « fluidité » trop rigides.",
  ],
  "etudiant-enseignement-trouver-premiers-eleves": [
    "Une offre étroite (niveau + matière + format) convertit mieux qu’un titre vague.",
    "Respectez les règles de votre programme et la protection des mineurs.",
    "Les avis prennent du temps : la clarté et la communication créent la rétention.",
  ],
  "professeur-retraite-enseigner-quelques-heures": [
    "Commencez avec un plafond d’heures modeste pour rester à l’aise.",
    "Votre expérience en classe est un atout — mettez l’accent sur planification et communication.",
    "Pour retraite et fiscalité, demandez conseil à un professionnel.",
  ],
  "freelance-quebec-cours-prives-bonne-option": [
    "Les élèves réguliers peuvent stabiliser un calendrier freelance autrement irrégulier.",
    "Des politiques claires (annulations, durée) réduisent les frictions.",
    "Les revenus varient : utilisez des repères du marché, pas des garanties.",
  ],
  "creer-profil-professeur-attirer-eleves": [
    "La spécificité bat les slogans : niveaux, matières et déroulement de la première séance doivent sauter aux yeux.",
    "Photo professionnelle et vérification réduisent la friction pour les familles.",
    "Réponses rapides et polies > branding parfait au début.",
  ],
  "combien-charger-cours-prive-quebec": [
    "Le prix dépend du niveau, de la matière, du format et de l’expérience.",
    "Comparez des profils similaires comme orientation, pas comme règle absolue.",
    "Ajuster se fait progressivement, avec communication transparente.",
  ],
  "donner-cours-francais-anglais-activite-flexible": [
    "Clarifiez le type d’élève (nouveaux arrivants, étudiants, professionnels).",
    "Des blocs de pratique ciblés et des devoirs réalistes fonctionnent mieux qu’une conversation sans but.",
    "Des limites d’horaire protègent la qualité — le flexible n’est pas 24/7.",
  ],
};
