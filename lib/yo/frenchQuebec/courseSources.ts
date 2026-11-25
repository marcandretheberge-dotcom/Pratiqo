import type { CourseSource } from "../italian/course/courseTypes";
import { t } from "./authoring";

/** Reference facts only: all characters, dialogues, schedules and tasks are original. */
export const frenchQuebecSources: CourseSource[] = [
  {
    id: "frqf-usito-rendez-vous",
    title: "Rendez-vous — prononciation",
    publisher: "Usito — Université de Sherbrooke",
    url: "https://usito.usherbrooke.ca/d%C3%A9finitions/rendez-vous",
    supports: t("Le z écrit de rendez-vous ne se prononce pas devant le v.", "The written z in rendez-vous is not pronounced before v.", "La z escrita de rendez-vous no se pronuncia delante de v."),
  },
  {
    id: "frqf-oqlf-tu-vous",
    title: "Contextes d’emploi du vouvoiement et du tutoiement",
    publisher: "Office québécois de la langue française",
    url: "https://vitrinelinguistique.oqlf.gouv.qc.ca/25140/la-redaction-et-la-communication/protocole-et-activites-publiques/contextes-demploi-du-vouvoiement-et-du-tutoiement",
    supports: t("Le choix entre tu et vous dépend de la relation et de la situation; une préférence peut se demander.", "The choice of tu or vous depends on the relationship and situation; a preference can be discussed.", "La elección entre tu y vous depende de la relación y la situación; se puede consultar la preferencia."),
  },
  {
    id: "frqf-usito-depanneur",
    title: "Dépanneur",
    publisher: "Usito — Université de Sherbrooke",
    url: "https://usito.usherbrooke.ca/d%C3%A9finitions/d%C3%A9panneur",
    supports: t("Dépanneur désigne notamment un petit commerce alimentaire de proximité dans l’usage québécois et canadien.", "Dépanneur can mean a small neighbourhood grocery in Québec and Canadian usage.", "Dépanneur puede designar una pequeña tienda de alimentación de barrio en el uso quebequés y canadiense."),
  },
  {
    id: "frqf-usito-diner",
    title: "Dîner — emploi québécois et canadien",
    publisher: "Usito — Université de Sherbrooke",
    url: "https://usito.usherbrooke.ca/lexies/mots/d%C3%AEner",
    supports: t("Dans l’usage québécois et canadien présenté, dîner renvoie au repas du milieu de la journée; préciser l’heure évite les confusions entre variétés de français.", "In the Québec and Canadian usage presented, dîner refers to the midday meal; stating a time avoids misunderstandings between varieties of French.", "En el uso quebequés y canadiense presentado, dîner se refiere a la comida del mediodía; precisar la hora evita confusiones entre variedades del francés."),
  },
  {
    id: "frqf-usito-tantot",
    title: "Tantôt",
    publisher: "Usito — Université de Sherbrooke",
    url: "https://usito.usherbrooke.ca/d%C3%A9finitions/tant%C3%B4t",
    supports: t("Tantôt peut situer un moment plus tôt ou plus tard dans la même journée, selon le contexte.", "Tantôt can refer to earlier or later in the same day, depending on context.", "Tantôt puede referirse a antes o después en el mismo día, según el contexto."),
  },
];
