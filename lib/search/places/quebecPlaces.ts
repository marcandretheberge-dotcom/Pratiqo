/**
 * Comprehensive Quebec municipal dataset for the Pratiqo Lieu autocomplete.
 *
 * Source: Repertoire des municipalites du Quebec (Donnees Quebec / MAMH)
 * cross-checked with Statistics Canada 2021 Census subdivisions for
 * population estimates. The list intentionally goes BEYOND the
 * Canada-wide 5,000 inhabitants threshold so that Pratiqo feels local
 * inside Quebec: it includes every regional centre, every Beauce
 * municipality the product owner flagged as strategic, and every
 * mid-sized municipality that students and teachers commonly type.
 *
 * Dataset shape: each tuple is converted into a CanadianPlace object by
 * the loader at the bottom of the file. Tuples are kept compact for
 * readability; aliases and "City, PROV" formatting are derived
 * mechanically by the alias generator.
 *
 * Tuple fields (in order):
 *   0 name           Display name (canonical, with accents/hyphens)
 *   1 lat            Approximate centre latitude
 *   2 lng            Approximate centre longitude
 *   3 population     2021 census population estimate (rounded)
 *   4 region         Quebec administrative region (FR, optional)
 *   5 mrc            MRC / agglomeration (optional)
 *   6 strategic      Boolean flag for hand-picked local landmarks
 *   7 extraAliases   Author-curated alias overrides (optional)
 *
 * No business logic, no Stripe/Supabase/payment code lives here.
 */

import type { CanadianPlace } from "../canadianPlaces.shared";
import { generateNameAliases } from "./_alias";

type QcTuple = [
  string,
  number,
  number,
  number,
  string,
  string,
  boolean?,
  string[]?,
];

// Order is alphabetical within each region for diff-friendliness.
const QUEBEC_RAW: QcTuple[] = [
  // ── Beauce strategic (Chaudiere-Appalaches) — explicit product-owner list ──
  ["Beauceville", 46.2166, -70.7833, 6612, "Chaudière-Appalaches", "Robert-Cliche", true],
  ["Frampton", 46.4500, -70.8500, 1400, "Chaudière-Appalaches", "La Nouvelle-Beauce", true],
  ["La Guadeloupe", 45.9500, -70.9333, 1700, "Chaudière-Appalaches", "Beauce-Sartigan", true],
  ["Saint-Benoît-Labre", 46.1167, -70.8000, 1700, "Chaudière-Appalaches", "Beauce-Sartigan", true],
  ["Saint-Côme-Linière", 46.0167, -70.5333, 3100, "Chaudière-Appalaches", "Beauce-Sartigan", true],
  ["Saint-Elzéar", 46.5500, -71.0167, 1900, "Chaudière-Appalaches", "La Nouvelle-Beauce", true],
  ["Saint-Éphrem-de-Beauce", 46.0500, -70.9833, 2500, "Chaudière-Appalaches", "Beauce-Sartigan", true],
  ["Saint-Évariste-de-Forsyth", 45.9333, -70.8833, 600, "Chaudière-Appalaches", "Beauce-Sartigan", true],
  ["Saint-Gédéon-de-Beauce", 45.8167, -70.6500, 2000, "Chaudière-Appalaches", "Beauce-Sartigan", true],
  ["Saint-Georges", 46.1167, -70.6667, 33597, "Chaudière-Appalaches", "Beauce-Sartigan", true, ["Saint-Georges-de-Beauce"]],
  ["Saint-Honoré-de-Shenley", 45.9667, -70.7833, 1700, "Chaudière-Appalaches", "Beauce-Sartigan", true],
  ["Saint-Joseph-de-Beauce", 46.3000, -70.8667, 5180, "Chaudière-Appalaches", "Robert-Cliche", true],
  ["Saint-Martin", 45.9667, -70.6167, 2300, "Chaudière-Appalaches", "Beauce-Sartigan", true],
  ["Saint-Odilon-de-Cranbourne", 46.2333, -70.7333, 1600, "Chaudière-Appalaches", "Robert-Cliche", true],
  ["Saint-Prosper", 46.2167, -70.5000, 3800, "Chaudière-Appalaches", "Les Etchemins", true],
  ["Saint-Théophile", 45.8333, -70.5167, 1000, "Chaudière-Appalaches", "Beauce-Sartigan", true],
  ["Saint-Victor", 46.1333, -70.9000, 2500, "Chaudière-Appalaches", "Robert-Cliche", true],
  ["Saint-Zacharie", 46.1167, -70.3500, 2000, "Chaudière-Appalaches", "Les Etchemins", true],
  ["Sainte-Marie", 46.4500, -71.0167, 13716, "Chaudière-Appalaches", "La Nouvelle-Beauce", true],
  ["Scott", 46.5000, -71.0667, 2300, "Chaudière-Appalaches", "La Nouvelle-Beauce", true],
  ["Tring-Jonction", 46.2500, -70.9167, 1400, "Chaudière-Appalaches", "Robert-Cliche", true],
  ["Vallée-Jonction", 46.3833, -70.9167, 1900, "Chaudière-Appalaches", "La Nouvelle-Beauce", true],

  // ── Chaudière-Appalaches: Lévis agglomeration + Bellechasse + Lotbinière + L'Islet + Montmagny ──
  ["Lévis", 46.8031, -71.1756, 149683, "Chaudière-Appalaches", "Lévis"],
  ["Saint-Lambert-de-Lauzon", 46.5833, -71.2000, 6700, "Chaudière-Appalaches", "La Nouvelle-Beauce"],
  ["Saint-Apollinaire", 46.6333, -71.5167, 6700, "Chaudière-Appalaches", "Lotbinière"],
  ["Saint-Henri", 46.6833, -71.0667, 5400, "Chaudière-Appalaches", "Bellechasse"],
  ["Saint-Anselme", 46.6167, -70.9833, 4000, "Chaudière-Appalaches", "Bellechasse"],
  ["Sainte-Claire", 46.5500, -70.8667, 3700, "Chaudière-Appalaches", "Bellechasse"],
  ["Saint-Charles-de-Bellechasse", 46.7833, -70.9500, 2400, "Chaudière-Appalaches", "Bellechasse"],
  ["Saint-Damien-de-Buckland", 46.6167, -70.6500, 2100, "Chaudière-Appalaches", "Bellechasse"],
  ["Saint-Lazare-de-Bellechasse", 46.6500, -70.7833, 1700, "Chaudière-Appalaches", "Bellechasse"],
  ["Saint-Raphaël", 46.7833, -70.7500, 2300, "Chaudière-Appalaches", "Bellechasse"],
  ["Saint-Vallier", 46.8833, -70.8167, 1100, "Chaudière-Appalaches", "Bellechasse"],
  ["Lac-Etchemin", 46.4000, -70.5000, 4000, "Chaudière-Appalaches", "Les Etchemins"],
  ["Sainte-Justine", 46.3333, -70.3833, 1700, "Chaudière-Appalaches", "Les Etchemins"],
  ["Thetford Mines", 46.1000, -71.3000, 25700, "Chaudière-Appalaches", "Les Appalaches"],
  ["East Broughton", 46.2333, -71.0833, 2400, "Chaudière-Appalaches", "Les Appalaches"],
  ["Disraeli", 45.9000, -71.3500, 2300, "Chaudière-Appalaches", "Les Appalaches"],
  ["Black Lake", 46.0500, -71.3667, 4000, "Chaudière-Appalaches", "Les Appalaches"],
  ["Adstock", 46.0500, -71.0833, 2700, "Chaudière-Appalaches", "Les Appalaches"],
  ["Montmagny", 46.9833, -70.5500, 11341, "Chaudière-Appalaches", "Montmagny"],
  ["Cap-Saint-Ignace", 47.0333, -70.4833, 3200, "Chaudière-Appalaches", "Montmagny"],
  ["L'Islet", 47.1167, -70.3667, 3700, "Chaudière-Appalaches", "L'Islet"],
  ["Saint-Jean-Port-Joli", 47.2167, -70.2667, 3300, "Chaudière-Appalaches", "L'Islet"],
  ["Sainte-Croix", 46.6167, -71.6833, 2500, "Chaudière-Appalaches", "Lotbinière"],
  ["Laurier-Station", 46.5333, -71.6333, 2700, "Chaudière-Appalaches", "Lotbinière"],

  // ── Capitale-Nationale (Québec area) ──
  ["Québec", 46.8139, -71.2082, 549459, "Capitale-Nationale", "Québec", false, ["Quebec City", "Ville de Québec"]],
  ["Saint-Augustin-de-Desmaures", 46.7411, -71.4486, 18800, "Capitale-Nationale", "La Jacques-Cartier"],
  ["L'Ancienne-Lorette", 46.7964, -71.3514, 16700, "Capitale-Nationale", "Québec"],
  ["Stoneham-et-Tewkesbury", 46.9833, -71.4167, 8200, "Capitale-Nationale", "La Jacques-Cartier"],
  ["Sainte-Brigitte-de-Laval", 46.9833, -71.2167, 7500, "Capitale-Nationale", "La Jacques-Cartier"],
  ["Boischatel", 46.9000, -71.1167, 8800, "Capitale-Nationale", "La Côte-de-Beaupré"],
  ["L'Ange-Gardien", 46.9167, -71.0833, 3600, "Capitale-Nationale", "La Côte-de-Beaupré"],
  ["Château-Richer", 46.9500, -71.0333, 4000, "Capitale-Nationale", "La Côte-de-Beaupré"],
  ["Sainte-Anne-de-Beaupré", 47.0167, -70.9333, 2700, "Capitale-Nationale", "La Côte-de-Beaupré"],
  ["Beaupré", 47.0500, -70.9000, 3400, "Capitale-Nationale", "La Côte-de-Beaupré"],
  ["Donnacona", 46.6783, -71.7250, 6500, "Capitale-Nationale", "Portneuf"],
  ["Pont-Rouge", 46.7500, -71.7000, 9700, "Capitale-Nationale", "Portneuf"],
  ["Saint-Raymond", 46.9000, -71.8333, 10300, "Capitale-Nationale", "Portneuf"],
  ["Saint-Marc-des-Carrières", 46.6833, -72.0500, 3000, "Capitale-Nationale", "Portneuf"],
  ["Lac-Beauport", 46.9500, -71.3000, 8400, "Capitale-Nationale", "La Jacques-Cartier"],
  ["Shannon", 46.8833, -71.5167, 7300, "Capitale-Nationale", "La Jacques-Cartier"],
  ["Fossambault-sur-le-Lac", 46.8833, -71.6167, 1900, "Capitale-Nationale", "La Jacques-Cartier"],
  ["Saint-Casimir", 46.6500, -72.1333, 1400, "Capitale-Nationale", "Portneuf"],
  ["Baie-Saint-Paul", 47.4500, -70.5000, 7300, "Capitale-Nationale", "Charlevoix"],
  ["La Malbaie", 47.6500, -70.1500, 8300, "Capitale-Nationale", "Charlevoix-Est"],
  ["Clermont", 47.6833, -70.2333, 3000, "Capitale-Nationale", "Charlevoix-Est"],

  // ── Communauté métropolitaine de Montréal — agglomération de Montréal ──
  ["Montréal", 45.5017, -73.5673, 1762949, "Montréal", "Montréal", false, ["Montreal"]],
  ["Montréal-Est", 45.6333, -73.5167, 4000, "Montréal", "Montréal"],
  ["Montréal-Ouest", 45.4500, -73.6500, 5200, "Montréal", "Montréal"],
  ["Westmount", 45.4833, -73.5833, 20300, "Montréal", "Montréal"],
  ["Côte-Saint-Luc", 45.4667, -73.6667, 34400, "Montréal", "Montréal"],
  ["Hampstead", 45.4833, -73.6333, 7100, "Montréal", "Montréal"],
  ["Mont-Royal", 45.5167, -73.6500, 21400, "Montréal", "Montréal", false, ["Town of Mount Royal", "TMR"]],
  ["Dollard-Des Ormeaux", 45.4833, -73.8167, 50500, "Montréal", "Montréal"],
  ["Pointe-Claire", 45.4500, -73.8333, 33500, "Montréal", "Montréal"],
  ["Kirkland", 45.4500, -73.8667, 21300, "Montréal", "Montréal"],
  ["Beaconsfield", 45.4333, -73.8667, 19800, "Montréal", "Montréal"],
  ["Sainte-Anne-de-Bellevue", 45.4017, -73.9450, 5100, "Montréal", "Montréal"],
  ["Senneville", 45.4333, -73.9667, 900, "Montréal", "Montréal"],
  ["Baie-D'Urfé", 45.4167, -73.9167, 3900, "Montréal", "Montréal"],
  ["Dorval", 45.4500, -73.7500, 18900, "Montréal", "Montréal"],
  ["L'Île-Dorval", 45.4500, -73.7333, 5, "Montréal", "Montréal"],

  // ── CMM — Couronne nord (Laurentides, Lanaudière, Laval) ──
  ["Laval", 45.6066, -73.7124, 438366, "Laval", "Laval"],
  ["Mirabel", 45.6500, -74.0833, 65500, "Laurentides", "Mirabel"],
  ["Saint-Eustache", 45.5667, -73.9000, 44600, "Laurentides", "Deux-Montagnes"],
  ["Deux-Montagnes", 45.5333, -73.9000, 18000, "Laurentides", "Deux-Montagnes"],
  ["Sainte-Marthe-sur-le-Lac", 45.5333, -73.9333, 19400, "Laurentides", "Deux-Montagnes"],
  ["Pointe-Calumet", 45.5167, -73.9667, 6800, "Laurentides", "Deux-Montagnes"],
  ["Saint-Joseph-du-Lac", 45.5333, -73.9833, 7200, "Laurentides", "Deux-Montagnes"],
  ["Oka", 45.4667, -74.0833, 4200, "Laurentides", "Deux-Montagnes"],
  ["Boisbriand", 45.6167, -73.8333, 27200, "Laurentides", "Thérèse-De Blainville"],
  ["Sainte-Thérèse", 45.6333, -73.8500, 26900, "Laurentides", "Thérèse-De Blainville"],
  ["Rosemère", 45.6333, -73.8000, 14300, "Laurentides", "Thérèse-De Blainville"],
  ["Bois-des-Filion", 45.6667, -73.7667, 9700, "Laurentides", "Thérèse-De Blainville"],
  ["Lorraine", 45.6833, -73.7833, 9700, "Laurentides", "Thérèse-De Blainville"],
  ["Blainville", 45.6745, -73.8780, 59819, "Laurentides", "Thérèse-De Blainville"],
  ["Saint-Jérôme", 45.7765, -74.0004, 80059, "Laurentides", "La Rivière-du-Nord"],
  ["Prévost", 45.8500, -74.0833, 13500, "Laurentides", "La Rivière-du-Nord"],
  ["Saint-Sauveur", 45.9000, -74.1667, 11400, "Laurentides", "Les Pays-d'en-Haut"],
  ["Sainte-Adèle", 45.9500, -74.1333, 13900, "Laurentides", "Les Pays-d'en-Haut"],
  ["Sainte-Agathe-des-Monts", 46.0500, -74.2833, 11400, "Laurentides", "Les Laurentides"],
  ["Mont-Tremblant", 46.1167, -74.5833, 10000, "Laurentides", "Les Laurentides"],
  ["Saint-Adolphe-d'Howard", 45.9667, -74.3333, 4400, "Laurentides", "Les Pays-d'en-Haut"],
  ["Lachute", 45.6500, -74.3333, 13500, "Laurentides", "Argenteuil"],
  ["Brownsburg-Chatham", 45.7333, -74.4167, 7600, "Laurentides", "Argenteuil"],
  ["Mont-Laurier", 46.5500, -75.5000, 14000, "Laurentides", "Antoine-Labelle"],
  ["Rivière-Rouge", 46.4000, -74.7667, 4500, "Laurentides", "Antoine-Labelle"],
  ["Repentigny", 45.7423, -73.4592, 86242, "Lanaudière", "L'Assomption"],
  ["L'Assomption", 45.8333, -73.4167, 23600, "Lanaudière", "L'Assomption"],
  ["Charlemagne", 45.7167, -73.4833, 6000, "Lanaudière", "L'Assomption"],
  ["L'Épiphanie", 45.8500, -73.4833, 9000, "Lanaudière", "L'Assomption"],
  ["Mascouche", 45.7500, -73.6000, 50800, "Lanaudière", "Les Moulins"],
  ["Terrebonne", 45.7000, -73.6333, 119944, "Lanaudière", "Les Moulins"],
  ["Sainte-Anne-des-Plaines", 45.7667, -73.8167, 16000, "Lanaudière", "Thérèse-De Blainville"],
  ["Saint-Lin-Laurentides", 45.8500, -73.7667, 22500, "Lanaudière", "Montcalm"],
  ["Sainte-Sophie", 45.8167, -73.9167, 16500, "Laurentides", "La Rivière-du-Nord"],
  ["Sainte-Julienne", 45.9667, -73.7167, 11200, "Lanaudière", "Montcalm"],
  ["Joliette", 46.0167, -73.4500, 21100, "Lanaudière", "Joliette"],
  ["Notre-Dame-des-Prairies", 46.0500, -73.4500, 9300, "Lanaudière", "Joliette"],
  ["Saint-Charles-Borromée", 46.0500, -73.4667, 14700, "Lanaudière", "Joliette"],
  ["Crabtree", 46.0833, -73.4500, 4200, "Lanaudière", "Joliette"],
  ["Berthierville", 46.0833, -73.1833, 4200, "Lanaudière", "D'Autray"],

  // ── CMM — Rive-Sud / Montérégie ──
  ["Longueuil", 45.5371, -73.5095, 254483, "Montérégie", "Agglomération de Longueuil"],
  ["Brossard", 45.4490, -73.4523, 91525, "Montérégie", "Agglomération de Longueuil"],
  ["Saint-Lambert", 45.5000, -73.5167, 22600, "Montérégie", "Agglomération de Longueuil"],
  ["Boucherville", 45.6000, -73.4333, 41700, "Montérégie", "Agglomération de Longueuil"],
  ["Saint-Bruno-de-Montarville", 45.5333, -73.3500, 26900, "Montérégie", "Agglomération de Longueuil"],
  ["Sainte-Julie", 45.5833, -73.3333, 30100, "Montérégie", "Marguerite-D'Youville"],
  ["Varennes", 45.7000, -73.4333, 21500, "Montérégie", "Marguerite-D'Youville"],
  ["Verchères", 45.7667, -73.3500, 5800, "Montérégie", "Marguerite-D'Youville"],
  ["Contrecoeur", 45.8500, -73.2333, 8800, "Montérégie", "Marguerite-D'Youville"],
  ["Saint-Amable", 45.6500, -73.3000, 12700, "Montérégie", "Marguerite-D'Youville"],
  ["Mont-Saint-Hilaire", 45.5667, -73.2000, 19200, "Montérégie", "La Vallée-du-Richelieu"],
  ["Beloeil", 45.5667, -73.2000, 23700, "Montérégie", "La Vallée-du-Richelieu"],
  ["Saint-Basile-le-Grand", 45.5333, -73.2667, 17600, "Montérégie", "La Vallée-du-Richelieu"],
  ["McMasterville", 45.5500, -73.2333, 6300, "Montérégie", "La Vallée-du-Richelieu"],
  ["Otterburn Park", 45.5333, -73.2167, 8800, "Montérégie", "La Vallée-du-Richelieu"],
  ["Saint-Mathieu-de-Beloeil", 45.6000, -73.2667, 2700, "Montérégie", "La Vallée-du-Richelieu"],
  ["Carignan", 45.4500, -73.3000, 9700, "Montérégie", "La Vallée-du-Richelieu"],
  ["Chambly", 45.4500, -73.3000, 30900, "Montérégie", "La Vallée-du-Richelieu"],
  ["Marieville", 45.4333, -73.1500, 11200, "Montérégie", "Rouville"],
  ["Richelieu", 45.4333, -73.2500, 5800, "Montérégie", "Rouville"],
  ["Saint-Jean-sur-Richelieu", 45.3072, -73.2628, 100554, "Montérégie", "Le Haut-Richelieu"],
  ["Saint-Mathias-sur-Richelieu", 45.4833, -73.1500, 4600, "Montérégie", "Rouville"],
  ["Saint-Rémi", 45.2667, -73.6167, 8500, "Montérégie", "Les Jardins-de-Napierville"],
  ["Saint-Isidore", 45.3000, -73.6833, 2600, "Montérégie", "Roussillon"],
  ["La Prairie", 45.4167, -73.4833, 26200, "Montérégie", "Roussillon"],
  ["Saint-Constant", 45.3667, -73.5667, 28100, "Montérégie", "Roussillon"],
  ["Sainte-Catherine", 45.4000, -73.5833, 17200, "Montérégie", "Roussillon"],
  ["Candiac", 45.3833, -73.5167, 22800, "Montérégie", "Roussillon"],
  ["Delson", 45.3667, -73.5500, 7900, "Montérégie", "Roussillon"],
  ["Saint-Philippe", 45.3500, -73.4833, 6300, "Montérégie", "Roussillon"],
  ["Châteauguay", 45.3667, -73.7500, 50800, "Montérégie", "Roussillon"],
  ["Mercier", 45.3167, -73.7500, 14000, "Montérégie", "Roussillon"],
  ["Beauharnois", 45.3167, -73.8667, 13000, "Montérégie", "Beauharnois-Salaberry"],
  ["Salaberry-de-Valleyfield", 45.2500, -74.1333, 41600, "Montérégie", "Beauharnois-Salaberry"],
  ["Saint-Lazare", 45.4000, -74.1333, 21500, "Montérégie", "Vaudreuil-Soulanges"],
  ["Hudson", 45.4500, -74.1500, 5300, "Montérégie", "Vaudreuil-Soulanges"],
  ["Vaudreuil-Dorion", 45.4000, -74.0333, 41700, "Montérégie", "Vaudreuil-Soulanges"],
  ["Pincourt", 45.3833, -73.9833, 15200, "Montérégie", "Vaudreuil-Soulanges"],
  ["L'Île-Perrot", 45.3833, -73.9500, 11000, "Montérégie", "Vaudreuil-Soulanges"],
  ["Notre-Dame-de-l'Île-Perrot", 45.3833, -74.0167, 11000, "Montérégie", "Vaudreuil-Soulanges"],
  ["Sorel-Tracy", 46.0333, -73.1167, 35000, "Montérégie", "Pierre-De Saurel"],
  ["Saint-Denis-sur-Richelieu", 45.7833, -73.1500, 2200, "Montérégie", "Les Maskoutains"],
  ["Saint-Hyacinthe", 45.6269, -72.9537, 59614, "Montérégie", "Les Maskoutains"],
  ["Granby", 45.4001, -72.7320, 70261, "Montérégie", "La Haute-Yamaska"],
  ["Cowansville", 45.2000, -72.7333, 14600, "Montérégie", "Brome-Missisquoi"],
  ["Bromont", 45.3167, -72.6500, 12600, "Montérégie", "Brome-Missisquoi"],
  ["Farnham", 45.2833, -72.9833, 9200, "Montérégie", "Brome-Missisquoi"],
  ["Bedford", 45.1167, -72.9833, 2700, "Montérégie", "Brome-Missisquoi"],
  ["Lac-Brome", 45.2167, -72.5167, 5800, "Montérégie", "Brome-Missisquoi", false, ["Knowlton"]],

  // ── Estrie / Cantons-de-l'Est ──
  ["Sherbrooke", 45.4042, -71.8929, 172950, "Estrie", "Sherbrooke"],
  ["Magog", 45.2667, -72.1500, 28833, "Estrie", "Memphrémagog"],
  ["Coaticook", 45.1333, -71.8000, 9300, "Estrie", "Coaticook"],
  ["Lac-Mégantic", 45.5833, -70.8833, 5786, "Estrie", "Le Granit"],
  ["Val-des-Sources", 45.7667, -71.9333, 6300, "Estrie", "Les Sources", false, ["Asbestos"]],
  ["Windsor", 45.5667, -72.0000, 5400, "Estrie", "Le Val-Saint-François"],
  ["Cookshire-Eaton", 45.4167, -71.6333, 5500, "Estrie", "Le Haut-Saint-François"],
  ["East Angus", 45.4833, -71.6667, 3500, "Estrie", "Le Haut-Saint-François"],
  ["Stanstead", 45.0167, -72.1000, 3000, "Estrie", "Memphrémagog"],
  ["Sutton", 45.1000, -72.6167, 4100, "Montérégie", "Brome-Missisquoi"],
  ["North Hatley", 45.3000, -72.0500, 700, "Estrie", "Memphrémagog"],

  // ── Centre-du-Québec ──
  ["Drummondville", 45.8838, -72.4826, 79258, "Centre-du-Québec", "Drummond"],
  ["Victoriaville", 46.0500, -71.9667, 47585, "Centre-du-Québec", "Arthabaska"],
  ["Plessisville", 46.2167, -71.7667, 6692, "Centre-du-Québec", "L'Érable"],
  ["Princeville", 46.1667, -71.8833, 6300, "Centre-du-Québec", "L'Érable"],
  ["Bécancour", 46.3333, -72.4333, 13900, "Centre-du-Québec", "Bécancour"],
  ["Nicolet", 46.2167, -72.6167, 8600, "Centre-du-Québec", "Nicolet-Yamaska"],
  ["Warwick", 45.9500, -71.9833, 4700, "Centre-du-Québec", "Arthabaska"],
  ["Saint-Cyrille-de-Wendover", 45.9333, -72.4333, 5500, "Centre-du-Québec", "Drummond"],
  ["Saint-Léonard-d'Aston", 46.1000, -72.3667, 2300, "Centre-du-Québec", "Nicolet-Yamaska"],

  // ── Mauricie ──
  ["Trois-Rivières", 46.3432, -72.5418, 139163, "Mauricie", "Trois-Rivières"],
  ["Shawinigan", 46.5667, -72.7500, 49714, "Mauricie", "Shawinigan"],
  ["La Tuque", 47.4500, -72.7833, 11200, "Mauricie", "La Tuque"],
  ["Louiseville", 46.2500, -72.9333, 7400, "Mauricie", "Maskinongé"],
  ["Saint-Tite", 46.7333, -72.5667, 4000, "Mauricie", "Mékinac"],
  ["Sainte-Anne-de-la-Pérade", 46.5833, -72.2000, 2100, "Mauricie", "Les Chenaux"],
  ["Saint-Étienne-des-Grès", 46.4167, -72.7833, 4400, "Mauricie", "Maskinongé"],
  ["Saint-Boniface", 46.5167, -72.8333, 4900, "Mauricie", "Maskinongé"],
  ["Notre-Dame-du-Mont-Carmel", 46.4500, -72.7000, 5500, "Mauricie", "Les Chenaux"],
  ["Yamachiche", 46.2667, -72.8333, 2700, "Mauricie", "Maskinongé"],

  // ── Outaouais ──
  ["Gatineau", 45.4765, -75.7013, 291041, "Outaouais", "Gatineau"],
  ["Chelsea", 45.5167, -75.7833, 7200, "Outaouais", "Les Collines-de-l'Outaouais"],
  ["Cantley", 45.5667, -75.7833, 11700, "Outaouais", "Les Collines-de-l'Outaouais"],
  ["La Pêche", 45.6333, -75.9000, 8100, "Outaouais", "Les Collines-de-l'Outaouais"],
  ["Val-des-Monts", 45.6500, -75.5667, 12200, "Outaouais", "Les Collines-de-l'Outaouais"],
  ["Pontiac", 45.5667, -76.0667, 5800, "Outaouais", "Les Collines-de-l'Outaouais"],
  ["Maniwaki", 46.3833, -75.9667, 3900, "Outaouais", "La Vallée-de-la-Gatineau"],
  ["Thurso", 45.6000, -75.2500, 2500, "Outaouais", "Papineau"],
  ["Buckingham", 45.5833, -75.4167, 13900, "Outaouais", "Gatineau"],
  ["Aylmer", 45.4000, -75.8500, 60500, "Outaouais", "Gatineau"],

  // ── Abitibi-Témiscamingue ──
  ["Rouyn-Noranda", 48.2362, -79.0231, 42334, "Abitibi-Témiscamingue", "Rouyn-Noranda"],
  ["Val-d'Or", 48.0972, -77.7825, 32881, "Abitibi-Témiscamingue", "La Vallée-de-l'Or"],
  ["Amos", 48.5667, -78.1167, 13000, "Abitibi-Témiscamingue", "Abitibi"],
  ["La Sarre", 48.8000, -79.2000, 7400, "Abitibi-Témiscamingue", "Abitibi-Ouest"],
  ["Senneterre", 48.3833, -77.2333, 2900, "Abitibi-Témiscamingue", "La Vallée-de-l'Or"],
  ["Témiscaming", 46.7167, -79.1000, 2400, "Abitibi-Témiscamingue", "Témiscamingue"],
  ["Ville-Marie", 47.3333, -79.4333, 2800, "Abitibi-Témiscamingue", "Témiscamingue"],

  // ── Saguenay-Lac-Saint-Jean ──
  ["Saguenay", 48.4279, -71.0698, 144746, "Saguenay-Lac-Saint-Jean", "Saguenay"],
  ["Alma", 48.5500, -71.6500, 30700, "Saguenay-Lac-Saint-Jean", "Lac-Saint-Jean-Est"],
  ["Roberval", 48.5167, -72.2333, 9700, "Saguenay-Lac-Saint-Jean", "Le Domaine-du-Roy"],
  ["Dolbeau-Mistassini", 48.8833, -72.2333, 13700, "Saguenay-Lac-Saint-Jean", "Maria-Chapdelaine"],
  ["Saint-Félicien", 48.6500, -72.4500, 10300, "Saguenay-Lac-Saint-Jean", "Le Domaine-du-Roy"],
  ["Métabetchouan-Lac-à-la-Croix", 48.4167, -71.9333, 4200, "Saguenay-Lac-Saint-Jean", "Lac-Saint-Jean-Est"],
  ["Saint-Honoré", 48.5333, -71.0667, 6200, "Saguenay-Lac-Saint-Jean", "Le Fjord-du-Saguenay"],
  ["Saint-Bruno", 48.4667, -71.6667, 2900, "Saguenay-Lac-Saint-Jean", "Lac-Saint-Jean-Est"],
  ["Saint-Ambroise", 48.5500, -71.3333, 3700, "Saguenay-Lac-Saint-Jean", "Le Fjord-du-Saguenay"],
  ["Hébertville", 48.4000, -71.6667, 2400, "Saguenay-Lac-Saint-Jean", "Lac-Saint-Jean-Est"],
  ["Normandin", 48.8333, -72.5333, 3100, "Saguenay-Lac-Saint-Jean", "Maria-Chapdelaine"],

  // ── Côte-Nord ──
  ["Sept-Îles", 50.2001, -66.3821, 25686, "Côte-Nord", "Sept-Rivières"],
  ["Baie-Comeau", 49.2167, -68.1500, 21508, "Côte-Nord", "Manicouagan"],
  ["Port-Cartier", 50.0333, -66.8667, 5500, "Côte-Nord", "Sept-Rivières"],
  ["Forestville", 48.7333, -69.0833, 3200, "Côte-Nord", "La Haute-Côte-Nord"],
  ["Havre-Saint-Pierre", 50.2333, -63.6000, 3300, "Côte-Nord", "Minganie"],
  ["Fermont", 52.7833, -67.0833, 2400, "Côte-Nord", "Caniapiscau"],

  // ── Bas-Saint-Laurent ──
  ["Rimouski", 48.4488, -68.5230, 48664, "Bas-Saint-Laurent", "Rimouski-Neigette"],
  ["Rivière-du-Loup", 47.8268, -69.5418, 19815, "Bas-Saint-Laurent", "Rivière-du-Loup"],
  ["Mont-Joli", 48.5833, -68.1833, 6200, "Bas-Saint-Laurent", "La Mitis"],
  ["Trois-Pistoles", 48.1167, -69.1667, 3300, "Bas-Saint-Laurent", "Les Basques"],
  ["Matane", 48.8500, -67.5333, 14300, "Bas-Saint-Laurent", "La Matanie"],
  ["Amqui", 48.4667, -67.4333, 6300, "Bas-Saint-Laurent", "La Matapédia"],
  ["Pohénégamook", 47.4833, -69.2500, 2700, "Bas-Saint-Laurent", "Témiscouata"],
  ["Témiscouata-sur-le-Lac", 47.6833, -68.8667, 4900, "Bas-Saint-Laurent", "Témiscouata"],
  ["La Pocatière", 47.3667, -70.0333, 4200, "Bas-Saint-Laurent", "Kamouraska"],
  ["Saint-Pascal", 47.5167, -69.8000, 3500, "Bas-Saint-Laurent", "Kamouraska"],
  ["Dégelis", 47.5500, -68.6500, 2900, "Bas-Saint-Laurent", "Témiscouata"],

  // ── Gaspésie–Îles-de-la-Madeleine ──
  ["Gaspé", 48.8333, -64.4833, 14600, "Gaspésie", "La Côte-de-Gaspé"],
  ["Chandler", 48.3500, -64.6833, 7300, "Gaspésie", "Le Rocher-Percé"],
  ["Carleton-sur-Mer", 48.1000, -66.1333, 4000, "Gaspésie", "Avignon"],
  ["Sainte-Anne-des-Monts", 49.1333, -66.5000, 6700, "Gaspésie", "La Haute-Gaspésie"],
  ["New Richmond", 48.1667, -65.8667, 3700, "Gaspésie", "Bonaventure"],
  ["Maria", 48.1833, -66.0000, 2400, "Gaspésie", "Bonaventure"],
  ["Bonaventure", 48.0333, -65.4833, 4200, "Gaspésie", "Bonaventure"],
  ["Paspébiac", 48.0333, -65.2500, 3000, "Gaspésie", "Bonaventure"],
  ["Percé", 48.5167, -64.2167, 3100, "Gaspésie", "Le Rocher-Percé"],
  ["Les Îles-de-la-Madeleine", 47.4167, -61.8500, 12100, "Gaspésie", "Les Îles-de-la-Madeleine"],

  // ── Nord-du-Québec ──
  ["Chibougamau", 49.9167, -74.3667, 7300, "Nord-du-Québec", "Eeyou Istchee Baie-James"],
  ["Lebel-sur-Quévillon", 49.0500, -76.9833, 1900, "Nord-du-Québec", "Eeyou Istchee Baie-James"],
  ["Matagami", 49.7500, -77.6333, 1300, "Nord-du-Québec", "Eeyou Istchee Baie-James"],
  ["Chapais", 49.7833, -74.8500, 1400, "Nord-du-Québec", "Eeyou Istchee Baie-James"],
  ["Kuujjuaq", 58.1000, -68.4000, 2600, "Nord-du-Québec", "Kativik"],
];

export const QUEBEC_PLACES: CanadianPlace[] = QUEBEC_RAW.map(
  ([name, lat, lng, population, region, mrc, strategic, extraAliases]) => ({
    name,
    provinceCode: "QC",
    provinceName: "Quebec",
    country: "CA",
    lat,
    lng,
    population,
    region,
    mrc,
    isStrategicLocal: strategic === true,
    aliases: [...generateNameAliases(name), ...(extraAliases ?? [])],
    source: "Donnees Quebec / MAMH 2021",
  }),
);
