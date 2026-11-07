import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { yopratiqoPrivacyAddendum } from "@/lib/legal/yopratiqoPrivacyAddendum";
import { LegalMarkdownBody } from "@/components/LegalMarkdownBody";
import { LearningAudio } from "@/components/yo/personalized/LearningAudio";
import { ItalianOnboarding } from "@/components/yo/personalized/ItalianOnboarding";
import { personalizedItalianCatalog, placementChecks } from "@/lib/yo/personalized/courseData";
import type { YoLocale } from "@/lib/yo/types";

const retired = {
 fr: { note: "Préférences sur cet appareil uniquement.", badge: "Voix IA", device: "Voix de l’appareil · aperçu", ai: "intelligence artificielle" },
 en: { note: "Preferences stay on this device.", badge: "AI voice", device: "Device voice · preview", ai: "artificial intelligence" },
 es: { note: "Las preferencias quedan en este dispositivo.", badge: "Voz IA", device: "Voz del dispositivo · vista previa", ai: "inteligencia artificial" },
};
let count=0;
for(const locale of ["fr","en","es"] as YoLocale[]){
 const c=retired[locale],addendum=yopratiqoPrivacyAddendum[locale];
 const onboarding=renderToStaticMarkup(<ItalianOnboarding locale={locale} catalog={personalizedItalianCatalog} checks={placementChecks} audioPaths={{}} onComplete={()=>{}}/>);
 assert.ok(!onboarding.includes(c.note));
 assert.match(onboarding,/data-yoppo-onboarding/);
 assert.ok(onboarding.includes("Italiano"));
 count++;console.log(`PASS ${locale}: onboarding remains rendered without the removed footnote`);
 const audio=renderToStaticMarkup(<LearningAudio text="Mi chiamo Nina." locale={locale}/>);
 assert.ok(!audio.includes(c.badge)&&!audio.includes(c.device));
 assert.match(audio,/<button/);
 count++;console.log(`PASS ${locale}: fallback control remains without a repeated voice badge`);
 const base=readFileSync(`content/legal/confidentialite.${locale}.md`,"utf8");
 assert.equal((base.match(/^## /gm)??[]).length,22);
 const content=`${base}\n\n---\n\n${addendum.content}`;
 const html=renderToStaticMarkup(<LegalMarkdownBody content={content} headingIds={[...Array.from({length:22},(_,i)=>`section-${i+1}`),addendum.id]}/>);
 assert.equal((html.match(/<h2 /g)??[]).length,23);
 assert.match(html,/id="yopratiqo-voix-preferences"/);
 assert.ok(html.includes(c.ai));
 assert.ok(addendum.content.includes("2026"));
 assert.ok(!/100%|entirely offline\.|entièrement hors ligne\.|totalmente sin conexión\./.test(addendum.content.replace(/ne garantit pas un traitement entièrement hors ligne\.|does not guarantee entirely offline processing\.|no garantiza un tratamiento totalmente sin conexión\./g,"")));
 count++;console.log(`PASS ${locale}: privacy disclosure renders after the 22 unchanged sections with a stable anchor`);
}
const page=readFileSync("app/(app)/legal/confidentialite/page.tsx","utf8");
assert.match(page,/yopratiqoPrivacyAddendum\[lang\]/);
assert.match(page,/id: addendum.id, label: addendum.label/);
assert.match(page,/addendum.content/);
count++;console.log("PASS privacy page wires the localized content, date and table-of-contents entry");
console.log(`${count} interface/privacy notice checks passed`);
