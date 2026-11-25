import type { CourseSource } from "../italian/course/courseTypes";
import { t } from "./depthAuthoring";

/** References for usage and teaching scope; all scenes and assessments are original. */
export const portugueseDepthSources: CourseSource[] = [
  {
    id: "ptbr-depth-pode-entrar", title: "Pode Entrar: Português do Brasil para refugiadas e refugiados",
    publisher: "ACNUR, Caritas Arquidiocesana de São Paulo et Curso Popular Mafalda",
    url: "https://www.acnur.org/fileadmin/Documentos/portugues/Publicacoes/2015/Pode_Entrar.pdf",
    supports: t("Pronoms et possession, famille et routine ; pages 12 et 22 pour a gente avec accord singulier et sa place dans les échanges courants. Les dialogues du parcours sont originaux.", "Pronouns and possession, family and routine; pages 12 and 22 for singular agreement with a gente and its everyday register. Course dialogues are original.", "Pronombres y posesión, familia y rutina; páginas 12 y 22 para a gente con concordancia singular y su registro cotidiano. Los diálogos del curso son originales."),
  },
  {
    id: "ptbr-depth-portas", title: "Portas Abertas: Português para imigrantes — Caderno básico, 2e édition",
    publisher: "Secretaria Municipal de Educação de São Paulo",
    url: "https://acervodigital.sme.prefeitura.sp.gov.br/wp-content/uploads/2021/08/caderno_basico_web.pdf",
    supports: t("Repères pour le portugais du quotidien ; annexes, pages 134–137, pour les formes du présent, du passé terminé et de l’imparfait. Aucune scène ni question n’est reproduite.", "Everyday Portuguese reference; appendix, pages 134–137, for present, completed past and imperfect forms. No scene or question is reproduced.", "Referencia del portugués cotidiano; anexo, páginas 134–137, para formas de presente, pasado terminado e imperfecto. No se reproduce ninguna escena ni pregunta."),
  },
  {
    id: "ptbr-depth-museu", title: "O Museu da Língua Portuguesa",
    publisher: "Museu da Língua Portuguesa",
    url: "https://www.museudalinguaportuguesa.org.br/mlp/o-museu/",
    supports: t("Diversité des accents, du vocabulaire et des usages : les modèles du cours ne représentent pas une seule voix nationale.", "Diversity of accents, vocabulary and usage: the course models do not represent one national voice.", "Diversidad de acentos, vocabulario y usos: los modelos del curso no representan una sola voz nacional."),
  },
  {
    id: "ptbr-depth-inep", title: "Celpe-Bras — présentation de l’évaluation",
    publisher: "Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira",
    url: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/celpe-bras/celpe-bras",
    supports: t("Distinction entre pratique dans des situations de communication et certification officielle. Le bilan écrit YoPratiqo ne certifie ni le Celpe-Bras ni un niveau du CECR.", "Distinguishes practice in communication situations from official certification. YoPratiqo’s written checkpoint certifies neither Celpe-Bras nor a CEFR level.", "Distingue práctica en situaciones comunicativas y certificación oficial. El balance escrito de YoPratiqo no certifica Celpe-Bras ni un nivel del MCER."),
  },
];
