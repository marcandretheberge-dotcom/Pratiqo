/**
 * Programmatic alias generation for Canadian place autocomplete.
 *
 * The user expects the Lieu autocomplete to behave like a native French
 * Canadian search box: typing "St Georges" must find "Saint-Georges, QC",
 * "Ste Marie" must find "Sainte-Marie, QC", "st joseph beauce" must find
 * "Saint-Joseph-de-Beauce, QC", etc. Hand-authoring every alternate
 * spelling for ~500 places is error-prone, so this module derives
 * aliases mechanically from the canonical name.
 *
 * The resulting alias list is fed into the search index alongside
 * any author-supplied aliases on the original `CanadianPlace` entry.
 */

/** Normalize for comparison: strip diacritics, drop apostrophes/hyphens, lowercase. */
function fold(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’`]/g, " ")
    .replace(/[-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const SAINT_HEAD = /^Saint(e?)([- ])/;
const STE_HEAD = /^Ste([- ])/i;
const ST_HEAD = /^St([- ])/i;

const SUFFIX_DROPS = [
  // Common Québec suffixes that French speakers strip out when searching:
  // "Saint-Joseph-de-Beauce" → typing "Saint Joseph" should still hit.
  "-de-Beauce",
  "-de-Bellechasse",
  "-de-Lévis",
  "-de-Buckland",
  "-de-Montmagny",
  "-de-Cranbourne",
  "-de-Forsyth",
  "-de-Shenley",
  "-de-Wendover",
  "-de-Dorchester",
  "-sur-Richelieu",
  "-sur-Mer",
  "-sur-Saguenay",
  "-sur-le-Lac",
  "-des-Monts",
  "-des-Cantons",
  "-des-Plaines",
  "-des-Lacs",
  "-du-Lac",
  "-d'Howard",
  "-de-Montarville",
  "-de-l'Île-d'Orléans",
];

/**
 * Generate a deduplicated set of aliases for a place name.
 * Always includes:
 *  - the diacritic-stripped, hyphen-flattened form
 *  - Saint ↔ St / Sainte ↔ Ste swaps
 *  - hyphen-stripped + suffix-stripped forms for Québec compound names
 */
export function generateNameAliases(name: string): string[] {
  const out = new Set<string>();
  const push = (s: string) => {
    const trimmed = s.trim();
    if (!trimmed) return;
    if (trimmed === name) return;
    out.add(trimmed);
  };

  push(name.replace(/[-]+/g, " "));
  push(fold(name));

  // Saint(e) ↔ St(e) variants in both directions.
  if (SAINT_HEAD.test(name)) {
    const stForm = name.replace(/^Saint([- ])/, "St$1");
    const steForm = name.replace(/^Sainte([- ])/, "Ste$1");
    push(stForm);
    push(steForm);
    push(stForm.replace(/[-]+/g, " "));
    push(steForm.replace(/[-]+/g, " "));
    push(fold(stForm));
    push(fold(steForm));
  } else if (STE_HEAD.test(name)) {
    const long = name.replace(/^Ste([- ])/i, "Sainte$1");
    push(long);
    push(long.replace(/[-]+/g, " "));
    push(fold(long));
  } else if (ST_HEAD.test(name)) {
    const long = name.replace(/^St([- ])/i, "Saint$1");
    push(long);
    push(long.replace(/[-]+/g, " "));
    push(fold(long));
  }

  // Drop common compound suffixes ("-de-Beauce" etc.) so a user typing the
  // shorter form still finds the place. We keep the prefix variant alone
  // and combine it with Saint→St swaps for full coverage.
  for (const suffix of SUFFIX_DROPS) {
    if (name.endsWith(suffix)) {
      const shortened = name.slice(0, -suffix.length);
      push(shortened);
      push(shortened.replace(/[-]+/g, " "));
      push(fold(shortened));
      if (/^Saint/.test(shortened)) {
        const swap = shortened.replace(/^Saint([- ])/, "St$1");
        push(swap);
        push(swap.replace(/[-]+/g, " "));
        push(fold(swap));
      }
      if (/^Sainte/.test(shortened)) {
        const swap = shortened.replace(/^Sainte([- ])/, "Ste$1");
        push(swap);
        push(swap.replace(/[-]+/g, " "));
        push(fold(swap));
      }
    }
  }

  // Apostrophe-stripped form (covers "Val-d'Or" → "val d or", "L'Assomption" → "l assomption").
  if (/['’]/.test(name)) {
    const stripped = name.replace(/['’]/g, "");
    push(stripped);
    push(stripped.replace(/[-]+/g, " "));
    push(fold(stripped));
  }

  return [...out];
}
