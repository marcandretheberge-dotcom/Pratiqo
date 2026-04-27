export interface City {
  name: string;
  lat: number;
  lng: number;
  province?: string;
  country: "CA" | "US" | "MX" | "ES";
}

export const CITIES: City[] = [
  // Québec — major cities + user's city (Beauceville)
  { name: "Montréal",        lat: 45.5017, lng: -73.5673, province: "QC", country: "CA" },
  { name: "Québec",          lat: 46.8139, lng: -71.2082, province: "QC", country: "CA" },
  { name: "Laval",           lat: 45.6066, lng: -73.7124, province: "QC", country: "CA" },
  { name: "Gatineau",        lat: 45.4765, lng: -75.7013, province: "QC", country: "CA" },
  { name: "Sherbrooke",      lat: 45.4042, lng: -71.8929, province: "QC", country: "CA" },
  { name: "Trois-Rivières",  lat: 46.3432, lng: -72.5418, province: "QC", country: "CA" },
  { name: "Saguenay",        lat: 48.4279, lng: -71.0698, province: "QC", country: "CA" },
  { name: "Lévis",           lat: 46.8031, lng: -71.1756, province: "QC", country: "CA" },
  { name: "Saint-Jérôme",    lat: 45.7765, lng: -74.0004, province: "QC", country: "CA" },
  { name: "Drummondville",   lat: 45.8838, lng: -72.4826, province: "QC", country: "CA" },
  { name: "Saint-Hyacinthe", lat: 45.6269, lng: -72.9537, province: "QC", country: "CA" },
  { name: "Beauceville",     lat: 46.2166, lng: -70.7833, province: "QC", country: "CA" },
  // Ontario
  { name: "Toronto",         lat: 43.6532, lng: -79.3832, province: "ON", country: "CA" },
  { name: "Ottawa",          lat: 45.4215, lng: -75.6972, province: "ON", country: "CA" },
];
