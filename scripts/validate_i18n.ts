import en from "../lib/i18n/locales/en.json";
import fr from "../lib/i18n/locales/fr.json";
import es from "../lib/i18n/locales/es.json";

const dictionaries = { fr, es } as const;
const sourceKeys = Object.keys(en).sort();
const sourceSet = new Set(sourceKeys);

let hasError = false;

for (const [locale, dictionary] of Object.entries(dictionaries)) {
  const keys = Object.keys(dictionary).sort();
  const keySet = new Set(keys);

  const missing = sourceKeys.filter((key) => !keySet.has(key));
  const extra = keys.filter((key) => !sourceSet.has(key));

  if (missing.length > 0 || extra.length > 0) {
    hasError = true;
    console.error(`\n${locale}.json is out of sync with en.json`);
    if (missing.length > 0) console.error(`Missing (${missing.length}): ${missing.join(", ")}`);
    if (extra.length > 0) console.error(`Extra (${extra.length}): ${extra.join(", ")}`);
  }
}

if (hasError) {
  process.exit(1);
}

console.log(`i18n dictionaries are valid (${sourceKeys.length} keys per locale).`);
