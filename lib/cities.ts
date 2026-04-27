export interface City {
  name: string;
  lat: number;
  lng: number;
  province?: string;
  country: "CA" | "US" | "MX" | "ES";
}

export const CITIES: City[] = [
  // ── Québec — grandes villes ──────────────────────────────────────────────
  { name: "Montréal",                  lat: 45.5017, lng: -73.5673, province: "QC", country: "CA" },
  { name: "Québec",                    lat: 46.8139, lng: -71.2082, province: "QC", country: "CA" },
  { name: "Laval",                     lat: 45.6066, lng: -73.7124, province: "QC", country: "CA" },
  { name: "Gatineau",                  lat: 45.4765, lng: -75.7013, province: "QC", country: "CA" },
  { name: "Trois-Rivières",            lat: 46.3432, lng: -72.5418, province: "QC", country: "CA" },
  { name: "Saguenay",                  lat: 48.4279, lng: -71.0698, province: "QC", country: "CA" },
  { name: "Lévis",                     lat: 46.8031, lng: -71.1756, province: "QC", country: "CA" },
  { name: "Saint-Jérôme",             lat: 45.7765, lng: -74.0004, province: "QC", country: "CA" },
  { name: "Drummondville",             lat: 45.8838, lng: -72.4826, province: "QC", country: "CA" },
  { name: "Saint-Hyacinthe",           lat: 45.6269, lng: -72.9537, province: "QC", country: "CA" },

  // ── Beauce ───────────────────────────────────────────────────────────────
  { name: "Beauceville",               lat: 46.2166, lng: -70.7833, province: "QC", country: "CA" },
  { name: "Saint-Georges",             lat: 46.1167, lng: -70.6667, province: "QC", country: "CA" },
  { name: "Saint-Joseph-de-Beauce",    lat: 46.3000, lng: -70.8667, province: "QC", country: "CA" },
  { name: "Sainte-Marie",              lat: 46.4500, lng: -71.0167, province: "QC", country: "CA" },
  { name: "Saint-Côme-Linière",        lat: 45.9500, lng: -70.5167, province: "QC", country: "CA" },
  { name: "Saint-Prosper",             lat: 46.2167, lng: -70.4833, province: "QC", country: "CA" },
  { name: "Lac-Etchemin",              lat: 46.4000, lng: -70.5000, province: "QC", country: "CA" },
  { name: "Saint-Martin",              lat: 45.9667, lng: -70.6500, province: "QC", country: "CA" },
  { name: "Saint-Victor",              lat: 46.1333, lng: -70.9000, province: "QC", country: "CA" },
  { name: "Vallée-Jonction",           lat: 46.3833, lng: -70.9167, province: "QC", country: "CA" },
  { name: "Sainte-Hénédine",           lat: 46.5667, lng: -70.9833, province: "QC", country: "CA" },

  // ── Estrie ───────────────────────────────────────────────────────────────
  { name: "Sherbrooke",                lat: 45.4042, lng: -71.8929, province: "QC", country: "CA" },
  { name: "Lac-Mégantic",              lat: 45.5833, lng: -70.8833, province: "QC", country: "CA" },
  { name: "Magog",                     lat: 45.2667, lng: -72.1500, province: "QC", country: "CA" },
  { name: "Coaticook",                 lat: 45.1333, lng: -71.8000, province: "QC", country: "CA" },
  { name: "East Angus",                lat: 45.4833, lng: -71.6667, province: "QC", country: "CA" },
  { name: "Thetford Mines",            lat: 46.1000, lng: -71.3000, province: "QC", country: "CA" },

  // ── Région de Québec ─────────────────────────────────────────────────────
  { name: "Saint-Henri",               lat: 46.7000, lng: -71.0667, province: "QC", country: "CA" },
  { name: "Saint-Anselme",             lat: 46.6167, lng: -70.9833, province: "QC", country: "CA" },
  { name: "Charny",                    lat: 46.7167, lng: -71.2667, province: "QC", country: "CA" },

  // ── Centre-du-Québec ─────────────────────────────────────────────────────
  { name: "Plessisville",              lat: 46.2167, lng: -71.7667, province: "QC", country: "CA" },
  { name: "Princeville",               lat: 46.1667, lng: -71.8833, province: "QC", country: "CA" },
  { name: "Victoriaville",             lat: 46.0500, lng: -71.9667, province: "QC", country: "CA" },
  { name: "Warwick",                   lat: 45.9500, lng: -71.9833, province: "QC", country: "CA" },

  // ── Ontario ──────────────────────────────────────────────────────────────
  { name: "Toronto",                   lat: 43.6532, lng: -79.3832, province: "ON", country: "CA" },
  { name: "Ottawa",                    lat: 45.4215, lng: -75.6972, province: "ON", country: "CA" },
];
