import language0 from "./content/anglais.json";
import language1 from "./content/francais-quebec.json";
import language2 from "./content/espagnol.json";
import language3 from "./content/allemand.json";
import language4 from "./content/portugais-bresil.json";
import language5 from "./content/japonais.json";
import language6 from "./content/mandarin.json";
const definitions = [language0,language1,language2,language3,language4,language5,language6];
import shared from "./common.json";
import type { IntroCourse, Phrase, Text, Concept, Mission, VocabularyGroup } from "./types";
type Definition = Omit<IntroCourse, "missions" | "final" | "phrases" | "glossary"> & {
 phrases: [string, string, Text, string | null, string[] | null][];
 glossary: [string, Text, "words" | "verbs" | "numbers"][];
 concepts: Concept[]; names: VocabularyGroup; origins: VocabularyGroup;
};
/** Rehydrate original language content on the server; the browser gets only its selected course. */
export const introCourses: IntroCourse[] = (definitions as unknown as Definition[]).map(d => {
 const { names, origins, concepts, ...base } = d;
 const phrases: Phrase[] = d.phrases.map(([id,text,meaning,reading,parts]) => ({id,text,meaning,...(reading?{reading}:{}),...(parts?{parts}:{})}));
 const visual = (phrase:string, pictures:VocabularyGroup, answer:string) => ({phrase,pictures,answer});
 const sets = [
   [visual("name",names,"0"), ...["well","soso","tired"].map(p=>visual(p,shared.feelings as VocabularyGroup,p))],
   [visual("canada",origins,"canada"),visual("local",origins,"local")],
   [20,21,28,30].map(n=>visual(`age${n}`,shared.ages as VocabularyGroup,String(n))),
 ];
 const missions: Mission[] = (shared.flow as Omit<Mission,"concepts"|"visuals"|"remember">[]).map((m,i)=>({...m,visuals:sets[i],concepts:i===0?concepts.slice(0,2):[concepts[i+1]],remember:concepts[i===0?1:i+1].body}));
 const final = [[0,0],[0,4],[1,0],[1,3],[2,1],[2,2]].map(([m,q],i)=>({...missions[m].practice[q],id:`final-${i+1}`}));
 return {...base,phrases,glossary:d.glossary.map(([text,meaning,group])=>({text,meaning,group})),missions,final};
});
export const findIntroCourse = (slug:string) => introCourses.find(c=>c.slug===slug);
export const introHref = (slug:string,locale:string) => `/yo/langues/${slug}/demarrer?lang=${locale}`;
