export const passCities = [
  { unit: "u02", round: "parma",   stage: "it:u02:rail",       city: "Parme",    title: "Un billet pour Parme",       goal: "Trouve ton train malgré un changement de voie." },
  { unit: "u03", round: "modena",  stage: "it:u03:bookshop",   city: "Modène",   title: "Les livres du groupe",       goal: "Récupère la bonne commande à la librairie." },
  { unit: "u04", round: "verona",  stage: "it:u04:breakfast",  city: "Vérone",   title: "Le rendez-vous du matin",    goal: "Organise le déjeuner avant une visite." },
  { unit: "u05", round: "napoli",  stage: "it:u05:caffe",      city: "Naples",   title: "Un café au comptoir",        goal: "Commande pour deux et vérifie ta monnaie." },
  { unit: "u06", round: "firenze", stage: "it:u06:directions", city: "Florence", title: "Rendez-vous au musée",       goal: "Suis un itinéraire à pied et explique-le à ton amie." },
  { unit: "u07", round: "siena",   stage: "it:u07:market",     city: "Sienne",   title: "Au marché de Sienne",        goal: "Choisis la taille et la quantité, puis règle tes achats." },
  { unit: "u08", round: "venezia", stage: "it:u08:vaporetto",  city: "Venise",   title: "Le bon vaporetto",           goal: "Trouve ton embarcadère et descends au bon arrêt." },
  { unit: "u09", round: "genova",  stage: "it:u09:invitation", city: "Gênes",    title: "Une sortie entre amis",      goal: "Adapte une invitation à un changement de météo." },
  { unit: "u10", round: "torino",  stage: "it:u10:hotel",      city: "Turin",    title: "La clé de ta chambre",       goal: "Confirme ta réservation et retrouve ta chambre." },
  { unit: "u11", round: "roma",    stage: "it:u11:postcard",   city: "Rome",     title: "Hier à Rome",                goal: "Raconte ta visite sans la confondre avec les projets de demain." },
  { unit: "u12", round: "palermo", stage: "it:u12:departure",  city: "Palerme",  title: "Le dernier départ",          goal: "Laisse tes bagages et retrouve-les à temps pour partir." },
] as const;

export type PassCity = (typeof passCities)[number];
export type CityRound = PassCity["round"];
export const cityForUnit = (unit: unknown) => passCities.find(city => city.unit === unit);
export const cityForRound = (round: unknown) => passCities.find(city => city.round === round);
export const halfWin = (city: PassCity) => city.round + "-half";
