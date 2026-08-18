/**
 * Flat expanded teacher disciplines taxonomy.
 *
 * Pins:
 *   - catalog includes required searchable disciplines
 *   - no required subcategory UX in teacher editor/onboarding
 *   - old Music / Languages / Academic ids still resolve
 *   - invalid ids are rejected on write
 *   - search buckets accept the new subjects
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MAX_TEACHER_DISCIPLINES,
  getDisciplineById,
  getEnabledDisciplines,
  resolveDisciplineId,
} from "@/lib/disciplines";
import {
  PRATIQO_DISCIPLINES,
  getDisciplineLabel,
  getTaxonomyDisciplineById,
  isActiveDisciplineId,
  requiredDisciplineIds,
} from "@/lib/taxonomy/disciplines";
import { searchSubjectBuckets } from "@/lib/search/subjectBuckets";
import { diagnoseTeacherSearchVisibility } from "@/lib/teachers/searchVisibilityDiagnostics";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
function test(name: string, fn: TestFn) {
  tests.push({ name, fn });
}

test("taxonomy includes all required flat disciplines", () => {
  for (const id of requiredDisciplineIds()) {
    const d = getTaxonomyDisciplineById(id);
    assert.ok(d, `missing ${id}`);
    assert.equal(d!.isActive, true);
    assert.equal(d!.searchable, true);
  }
  assert.ok(PRATIQO_DISCIPLINES.length >= 80);
  assert.equal(MAX_TEACHER_DISCIPLINES, 5);
});

test("no required subcategory structure is introduced", () => {
  const editor = read("components/teacher/TeacherDisciplinesEditor.tsx");
  const onboarding = read("app/onboarding/page.tsx");
  assert.match(editor, /flatDisciplineHint/);
  assert.match(editor, /whatDoYouTeach/);
  assert.doesNotMatch(editor, /Arts → Photographie|category-first|required subcategory/i);
  assert.match(onboarding, /whatDoYouTeach/);
  assert.doesNotMatch(onboarding, /D'autres disciplines seront bientôt disponibles/);
  assert.match(editor, /disciplineApproachOptional/);
});

test("teacher onboarding and profile management render expanded flat disciplines", () => {
  const onboarding = read("app/onboarding/page.tsx");
  const editor = read("components/teacher/TeacherDisciplinesEditor.tsx");
  const verification = read("app/(app)/teacher/verification/page.tsx");
  assert.match(onboarding, /getEnabledDisciplines/);
  assert.match(onboarding, /MAX_TEACHER_DISCIPLINES/);
  assert.match(editor, /getEnabledDisciplines/);
  assert.match(verification, /MAX_TEACHER_DISCIPLINES/);
  const enabled = getEnabledDisciplines();
  for (const id of ["photographie", "cuisine", "coach_sportif", "danse", "francisation", "piano", "espagnol", "mathematiques"]) {
    assert.ok(enabled.some((d) => d.id === id), `enabled catalog missing ${id}`);
  }
});

test("old music/language/academic values map backward-compatibly", () => {
  assert.equal(resolveDisciplineId("music"), "musique");
  assert.equal(resolveDisciplineId("musique"), "musique");
  assert.equal(resolveDisciplineId("language"), "langues");
  assert.equal(resolveDisciplineId("languages"), "langues");
  assert.equal(resolveDisciplineId("langues"), "langues");
  assert.equal(resolveDisciplineId("academic"), "tuteurs");
  assert.equal(resolveDisciplineId("academique"), "tuteurs");
  assert.equal(resolveDisciplineId("tutoring"), "tuteurs");
  assert.equal(resolveDisciplineId("tutorat"), "tuteurs");
  assert.equal(getDisciplineById("musique")?.label, "Musique");
  assert.equal(getDisciplineById("langues")?.label, "Langues");
  assert.ok(getDisciplineById("tuteurs")?.label);
  assert.equal(isActiveDisciplineId("musique"), true);
  assert.equal(isActiveDisciplineId("not_a_real_discipline"), false);
});

test("invalid discipline is rejected by helpers", () => {
  assert.equal(resolveDisciplineId("bien-etre-leger"), null);
  assert.equal(getDisciplineById("bien-etre-leger"), undefined);
  const complete = read("app/api/onboarding/complete/route.ts");
  assert.match(complete, /filter\(\(x\) => x\.known\)/);
});

test("search accepts new discipline queries without exposing private data", () => {
  const cases: Array<[string, string]> = [
    ["photographie", "photography"],
    ["cuisine", "cooking"],
    ["coach sportif", "coach_trainer"],
    ["danse", "dance"],
    ["francisation", "francisation"],
    ["piano", "piano"],
    ["espagnol", "spanish"],
    ["mathematiques", "math"],
    ["yoga", "yoga"],
    ["excel", "excel"],
    ["orthopédagogue", "orthopedagogue"],
    ["orthopedagogue", "orthopedagogue"],
    ["orthopédagogie", "orthopedagogie"],
    ["soutien scolaire", "academic_support"],
    ["lecture", "reading_writing"],
    ["difficultés d’apprentissage", "learning_difficulties"],
  ];
  for (const [q, id] of cases) {
    const hits = searchSubjectBuckets(q, { locale: "fr", limit: 12 });
    assert.ok(
      hits.some((h) => h.bucket.canonicalId === id),
      `search "${q}" should hit ${id}`,
    );
  }
  const searchSrc = read("lib/search/subjectBuckets.ts");
  assert.doesNotMatch(searchSrc, /home_address|stripe_account_id|email/);
});

test("visibility diagnostics still pass for Music/Language/Academic teachers", () => {
  const profile = {
    id: "22222222-2222-4222-8222-222222222222",
    role: "teacher",
    teacher_onboarding_complete: true,
    is_active: true,
  };
  const base = {
    id: "11111111-1111-4111-8111-111111111111",
    user_id: profile.id,
    name: "Marie",
    bio: "Professeure de piano.",
    country_code: "CA",
    teaching_mode: "online",
    price_per_lesson: 45,
    is_public: true,
    identity_verified: true,
  };
  for (const category of ["Musique", "Langues", "Scolaire"]) {
    const result = diagnoseTeacherSearchVisibility({
      profile,
      teacher: { ...base, category, discipline: "—" },
      disciplineCount: 1,
      inTeachersPublicView: true,
    });
    assert.equal(result.visibleInSearch, true, `${category} should remain visible`);
    assert.ok(!result.blockingReasonCodes.includes("BLOCKER_MISSING_SUBJECT"));
  }
  const photo = diagnoseTeacherSearchVisibility({
    profile,
    teacher: { ...base, category: "Photographie", discipline: "Photographie" },
    disciplineCount: 1,
    inTeachersPublicView: true,
  });
  assert.equal(photo.visibleInSearch, true);
});

test("admin Teacher 360 still labels disciplines from the catalog", () => {
  const src = read("lib/admin/teacher360.ts");
  assert.match(src, /getDisciplineById/);
  assert.match(src, /teacher_disciplines/);
  assert.equal(getDisciplineById("photographie")?.label, "Photographie");
  assert.equal(getDisciplineById("cuisine")?.label, "Cuisine");
});

test("onboarding complete does not change checkout or booking math", () => {
  const complete = read("app/api/onboarding/complete/route.ts");
  assert.doesNotMatch(complete, /stripe\.|webhook|platform_fee/);
  const taxonomy = read("lib/taxonomy/disciplines.ts");
  assert.doesNotMatch(taxonomy, /internalGroup.*=.*required/);
});

const REQUIRED_ES_BY_FR: Record<string, string> = {
  Musique: "Música",
  Piano: "Piano",
  Guitare: "Guitarra",
  Chant: "Canto",
  Violon: "Violín",
  Batterie: "Batería",
  "Production musicale": "Producción musical",
  "Théorie musicale": "Teoría musical",
  Langues: "Idiomas",
  Anglais: "Inglés",
  Espagnol: "Español",
  Français: "Francés",
  Allemand: "Alemán",
  Japonais: "Japonés",
  Italien: "Italiano",
  Portugais: "Portugués",
  Mandarin: "Mandarín",
  Coréen: "Coreano",
  Arabe: "Árabe",
  "Langue des signes": "Lengua de señas",
  Francisation: "Francización",
  "Français langue seconde": "Francés como segunda lengua",
  "Préparation TEF / TCF": "Preparación TEF / TCF",
  "Conversation française": "Conversación en francés",
  "Français professionnel": "Francés profesional",
  "Tuteurs académiques": "Tutoría académica",
  Mathématiques: "Matemáticas",
  "Français scolaire": "Francés escolar",
  "Anglais scolaire": "Inglés escolar",
  Sciences: "Ciencias",
  Physique: "Física",
  Chimie: "Química",
  Biologie: "Biología",
  Histoire: "Historia",
  Géographie: "Geografía",
  "Aide aux devoirs": "Ayuda con tareas",
  "Préparation aux examens": "Preparación de exámenes",
  "Méthodes d’étude": "Métodos de estudio",
  Photographie: "Fotografía",
  Vidéographie: "Videografía",
  "Montage vidéo": "Edición de video",
  "Retouche photo": "Edición fotográfica",
  "Création de contenu": "Creación de contenido",
  Cuisine: "Cocina",
  Pâtisserie: "Pastelería",
  "Cuisine familiale": "Cocina familiar",
  "Cuisine santé": "Cocina saludable",
  "Cuisine internationale": "Cocina internacional",
  "Coach sportif": "Entrenador personal",
  "Mise en forme": "Puesta en forma",
  Musculation: "Musculación",
  "Course à pied": "Running",
  Mobilité: "Movilidad",
  Yoga: "Yoga",
  Pilates: "Pilates",
  Natation: "Natación",
  "Arts martiaux": "Artes marciales",
  Danse: "Danza",
  Salsa: "Salsa",
  Bachata: "Bachata",
  Ballet: "Ballet",
  "Danse contemporaine": "Danza contemporánea",
  "Danse urbaine": "Danza urbana",
  "Danse sociale": "Baile social",
  Arts: "Artes",
  Dessin: "Dibujo",
  Peinture: "Pintura",
  Illustration: "Ilustración",
  Aquarelle: "Acuarela",
  Théâtre: "Teatro",
  "Écriture créative": "Escritura creativa",
  Informatique: "Informática",
  "Initiation à l’ordinateur": "Iniciación a la computación",
  Excel: "Excel",
  Programmation: "Programación",
  "Développement web": "Desarrollo web",
  "Intelligence artificielle": "Inteligencia artificial",
  Cybersécurité: "Ciberseguridad",
  Robotique: "Robótica",
  "Développement professionnel": "Desarrollo profesional",
  "Prise de parole": "Oratoria",
  Communication: "Comunicación",
  Leadership: "Liderazgo",
  "Préparation entrevue": "Preparación para entrevistas",
  "CV et carrière": "CV y carrera",
  Comptabilité: "Contabilidad",
  Entrepreneuriat: "Emprendimiento",
  Marketing: "Marketing",
  "Jeux et stratégie": "Juegos y estrategia",
  Échecs: "Ajedrez",
  Poker: "Póker",
  "Jeux de société": "Juegos de mesa",
  Logique: "Lógica",
  Artisanat: "Artesanía",
  Couture: "Costura",
  Tricot: "Tejido",
  Menuiserie: "Carpintería",
  Bricolage: "Bricolaje",
  Jardinage: "Jardinería",
  Orthopédagogue: "Psicopedagogo/a",
  Orthopédagogie: "Psicopedagogía",
  "Soutien scolaire": "Apoyo escolar",
  "Lecture et écriture": "Lectura y escritura",
  "Difficultés d’apprentissage": "Dificultades de aprendizaje",
  Autre: "Otro",
};

test("every discipline has required French, English, and Spanish labels", () => {
  const typeSrc = read("lib/taxonomy/disciplines.ts");
  assert.match(typeSrc, /labelEs: string;/);
  assert.doesNotMatch(typeSrc, /labelEs\?: string;/);
  for (const d of PRATIQO_DISCIPLINES) {
    assert.equal(typeof d.labelFr, "string");
    assert.ok(d.labelFr.trim().length > 0, `${d.id} missing labelFr`);
    assert.equal(typeof d.labelEn, "string");
    assert.ok(d.labelEn.trim().length > 0, `${d.id} missing labelEn`);
    assert.equal(typeof d.labelEs, "string");
    assert.ok(d.labelEs.trim().length > 0, `${d.id} missing labelEs`);
    const expectedEs = REQUIRED_ES_BY_FR[d.labelFr];
    assert.ok(expectedEs, `unexpected French label for ${d.id}: ${d.labelFr}`);
    assert.equal(d.labelEs, expectedEs, `${d.id} Spanish label`);
  }
  assert.equal(PRATIQO_DISCIPLINES.length, Object.keys(REQUIRED_ES_BY_FR).length);
});

test("taxonomy label helper returns es/en/fr with French fallback", () => {
  assert.equal(getDisciplineLabel("photographie", "es"), "Fotografía");
  assert.equal(getDisciplineLabel("cuisine", "es"), "Cocina");
  assert.equal(getDisciplineLabel("coach_sportif", "es"), "Entrenador personal");
  assert.equal(getDisciplineLabel("photographie", "en"), "Photography");
  assert.equal(getDisciplineLabel("photographie", "fr"), "Photographie");
  assert.equal(getDisciplineLabel("photographie", "pt"), "Photographie");
  assert.equal(getDisciplineLabel("photographie"), "Photographie");
  assert.equal(getDisciplineLabel("not_a_real_discipline", "es"), "");
});

test("academic support disciplines include orthopedagogue and related labels", () => {
  const ids = [
    "orthopedagogue",
    "orthopedagogie",
    "soutien_scolaire",
    "lecture_ecriture",
    "difficultes_apprentissage",
  ];
  for (const id of ids) {
    const d = getTaxonomyDisciplineById(id);
    assert.ok(d, `missing ${id}`);
    assert.ok(d!.labelFr);
    assert.ok(d!.labelEn);
    assert.ok(d!.labelEs);
  }
  assert.equal(getDisciplineById("orthopedagogue")?.label, "Orthopédagogue");
  assert.equal(getDisciplineById("orthopedagogie")?.label, "Orthopédagogie");
  assert.equal(resolveDisciplineId("orthopédagogue"), "orthopedagogue");
  assert.equal(resolveDisciplineId("orthopedagogue"), "orthopedagogue");
  assert.equal(resolveDisciplineId("orthopedagogy"), "orthopedagogie");
  assert.equal(resolveDisciplineId("soutien_scolaire_primaire"), "soutien_scolaire");
  assert.equal(resolveDisciplineId("academic_support"), "soutien_scolaire");
  assert.equal(resolveDisciplineId("lecture"), "lecture_ecriture");
  assert.equal(resolveDisciplineId("écriture"), "lecture_ecriture");
  assert.equal(resolveDisciplineId("learning_difficulties"), "difficultes_apprentissage");
});

(async () => {
  let passed = 0;
  for (const { name, fn } of tests) {
    await fn();
    passed += 1;
    console.log(`✓ ${name}`);
  }
  console.log(`\n[taxonomy:flat-disciplines] ${passed} assertions passed.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
