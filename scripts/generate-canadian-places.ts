/**
 * Documentation + summary script for the Canadian places dataset.
 *
 * Run with:
 *   npx tsx scripts/generate-canadian-places.ts
 *
 * What this script does:
 *   - Loads the aggregated `CANADIAN_PLACES` dataset.
 *   - Prints a per-province summary, total counts, the official sources
 *     used for each split, and the inclusion rules in effect.
 *   - Verifies the Beauce strategic anchors the product owner flagged.
 *
 * What this script does NOT do (and intentionally so):
 *   - It does not fetch live data at runtime. Pratiqo's marketplace
 *     must keep functioning even when Donnees Quebec or Statistics
 *     Canada APIs are down, so the dataset is committed as plain TS.
 *   - It does not touch Stripe, Supabase, RLS, payouts, legal copy,
 *     migrations, or business logic.
 *
 * Sources documented here so a future contributor can regenerate the
 * dataset against a fresh census release without re-deriving the
 * inclusion rules:
 *
 *   Quebec
 *   ──────
 *     - Repertoire des municipalites du Quebec (Donnees Quebec / MAMH)
 *       https://www.donneesquebec.ca/recherche/dataset/repertoire-des-municipalites-du-quebec
 *     - Statistics Canada 2021 Census Subdivisions (population)
 *
 *     Inclusion rule:
 *       * All major regional centres
 *       * Every Beauce municipality the product owner explicitly listed
 *         (flagged isStrategicLocal = true)
 *       * Couronne nord (Laurentides / Lanaudière) + Montérégie + Capitale-
 *         Nationale + Estrie + Centre-du-Québec + Mauricie + Outaouais +
 *         Saguenay-Lac-Saint-Jean + Bas-Saint-Laurent + Côte-Nord +
 *         Abitibi-Témiscamingue + Gaspésie + Nord-du-Québec coverage
 *       * Quebec is intentionally NOT capped at 5,000 inhabitants
 *
 *   Canada outside Quebec
 *   ─────────────────────
 *     - Statistics Canada 2021 Census Subdivisions (CSDs)
 *     - Statistics Canada 2021 Population Centres
 *
 *     Inclusion rule:
 *       * Every CSD / population centre with population >= 5,000
 *       * Major-city aliases preserved (e.g. "Sault Sainte Marie",
 *         "Cape Breton Regional Municipality")
 *       * Every province + territory must be represented (incl. small
 *         capitals: Whitehorse, Yellowknife, Iqaluit)
 */

import {
  CANADIAN_PLACES,
  type CanadianPlace,
  type CanadianProvinceCode,
  PROVINCE_LABELS_BY_LOCALE,
} from "../lib/search/canadianPlaces";

const PROVINCES_ORDERED: CanadianProvinceCode[] = [
  "QC",
  "ON",
  "AB",
  "BC",
  "MB",
  "SK",
  "NS",
  "NB",
  "NL",
  "PE",
  "YT",
  "NT",
  "NU",
];

const BEAUCE_STRATEGIC = [
  "Saint-Georges",
  "Sainte-Marie",
  "Beauceville",
  "Saint-Joseph-de-Beauce",
  "Saint-Prosper",
  "Saint-Côme-Linière",
  "Saint-Éphrem-de-Beauce",
  "La Guadeloupe",
  "Saint-Benoît-Labre",
  "Vallée-Jonction",
  "Scott",
  "Saint-Elzéar",
  "Frampton",
  "Tring-Jonction",
  "Saint-Odilon-de-Cranbourne",
  "Saint-Victor",
  "Saint-Évariste-de-Forsyth",
  "Saint-Honoré-de-Shenley",
  "Saint-Martin",
  "Saint-Gédéon-de-Beauce",
  "Saint-Théophile",
  "Saint-Zacharie",
];

function summarize(places: CanadianPlace[]) {
  const byProvince = new Map<CanadianProvinceCode, CanadianPlace[]>();
  for (const place of places) {
    const list = byProvince.get(place.provinceCode) ?? [];
    list.push(place);
    byProvince.set(place.provinceCode, list);
  }
  return byProvince;
}

function main() {
  console.log("Pratiqo — Canadian places dataset summary\n");
  console.log(`Total entries: ${CANADIAN_PLACES.length}\n`);

  const byProvince = summarize(CANADIAN_PLACES);
  console.log("Per-province breakdown:");
  for (const code of PROVINCES_ORDERED) {
    const list = byProvince.get(code) ?? [];
    const label = PROVINCE_LABELS_BY_LOCALE[code].en;
    console.log(`  ${code}  ${label.padEnd(28)}  ${String(list.length).padStart(4)}`);
  }

  const qcCount = (byProvince.get("QC") ?? []).length;
  const otherCount = CANADIAN_PLACES.length - qcCount;
  console.log(`\nQuebec: ${qcCount} places (no population threshold).`);
  console.log(`Canada outside Quebec: ${otherCount} places (>= 5,000 inhabitants).`);

  console.log("\nBeauce strategic anchors:");
  const placeNames = new Set(
    CANADIAN_PLACES.filter((p) => p.provinceCode === "QC").map((p) => p.name),
  );
  let missing = 0;
  for (const name of BEAUCE_STRATEGIC) {
    const ok = placeNames.has(name);
    console.log(`  [${ok ? "x" : " "}] ${name}`);
    if (!ok) missing += 1;
  }
  if (missing > 0) {
    console.error(`\n${missing} Beauce anchor(s) missing.`);
    process.exit(1);
  }

  console.log("\nDataset OK. Sources are documented at the top of this script.");
}

main();
