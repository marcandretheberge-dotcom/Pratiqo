import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import ItalianWordBankPage from "@/app/yo/langues/italien/parcours/[unitId]/vocabulaire/page";
import SharedWordBankPage from "@/app/yo/langues/[language]/demarrer/vocabulaire/page";

type Localized = "fr" | "en" | "es";

function verifySurface(html: string, label: string, articleMarker: string) {
  assert.match(html, /data-yo-word-bank-page/, `${label}: isolated printable page`);
  assert.match(html, /color-scheme:light/, `${label}: native iOS surface follows light theme`);
  assert.match(html, /bg-\[#fffdf8\]/, `${label}: full viewport uses a cream background`);
  assert.match(html, /min-h-screen/, `${label}: background covers full iPhone viewport`);
  assert.match(html, new RegExp(`${articleMarker}[^>]*bg-white`), `${label}: printable article uses an opaque light surface`);
  assert.match(html, /text-stone-900/, `${label}: dark readable foreground`);
  assert.match(html, /table-fixed/, `${label}: no long-table mobile overflow`);
  assert.match(html, /break-words/, `${label}: long expressions wrap rather than push columns`);
  assert.match(html, /text-base sm:text-sm/, `${label}: legible mobile-sized vocabulary`);
  assert.match(html, /@media print/, `${label}: print layout still available`);
  assert.match(html, /background:white!important/, `${label}: paper output remains white`);
  assert.match(html, /visibility:visible/, `${label}: printable table remains visible`);
  assert.match(html, /scope="col"/, `${label}: table headers accessible`);
  assert.match(html, /lang="it"/, `${label}: Italian speech columns tagged appropriately`);
}

async function main() {
for (const locale of ["fr", "en", "es"] as Localized[]) {
  for (const unitId of ["u01", "u02", "u05"]) {
    const output = await ItalianWordBankPage({
      params: Promise.resolve({ unitId }),
      searchParams: Promise.resolve({ lang: locale }),
    });
    const html = renderToStaticMarkup(output);
    verifySurface(html, `Italian ${unitId}/${locale}`, "data-word-bank-print");
    assert.match(html, /YoPratiqo/, "publisher attribution remains visible");
    assert.match(html, /noindex|print/i, "printable reference remains present");
    assert.match(html, /Italiano/, "native language column title present");
    if (locale === "fr") assert.match(html, /Français/);
    if (locale === "en") assert.match(html, /English/);
    if (locale === "es") assert.match(html, /Español/);
  }
}
for (const language of ["espagnol", "francais-quebec", "japonais"]) {
  for (const locale of ["fr", "en", "es"] as Localized[]) {
    const output = await SharedWordBankPage({
      params: Promise.resolve({ language }),
      searchParams: Promise.resolve({ lang: locale }),
    });
    const html = renderToStaticMarkup(output);
    assert.match(html, /data-yo-word-bank-page/, `${language}/${locale}: shared vocab is isolated from dark theme`);
    assert.match(html, /color-scheme:light/, `${language}/${locale}: iPhone dark-mode isolation`);
    assert.match(html, /bg-\[#fffdf8\]/, `${language}/${locale}: background remains light`);
    assert.match(html, /data-shared-print[^>]*bg-white/, `${language}/${locale}: paper-like white article`);
    assert.match(html, /table-fixed/, `${language}/${locale}: responsive columns`);
    assert.match(html, /break-words/, `${language}/${locale}: word wrapping`);
    assert.match(html, /@media print/, `${language}/${locale}: print support preserved`);
    assert.match(html, /visibility:visible/, `${language}/${locale}: printable content`);
  }
}
console.log("Word-bank light surfaces: 18 localized route renderings passed (iPhone dark appearance + print semantics)");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
