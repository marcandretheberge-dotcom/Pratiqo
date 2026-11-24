import { railBeat, type RailRun } from "./rail";
import type { CityRound, PassCity } from "./cities";

export type SituationBeat = { prompt: string; options: string[]; answer: number; hint: string; audio?: string; transcript?: string };
type SceneLine = [prompt: string, correct: string, firstDistractor: string, secondDistractor: string, hint: string];
type Scene = {
  opening: SceneLine;
  reply: SceneLine;
  heard: [speech: string, question: SceneLine];
  endings: [SceneLine, SceneLine];
};

// Each city builds one interaction from a first request through an announcement and a reply in a changed situation.
const scenes: Record<Exclude<CityRound, "parma">, Scene> = {
  modena: {
    opening: ["À la librairie, tu viens chercher deux livres italiens. Que demandes-tu ?", "Cerco due libri italiani.", "Cerco due quaderni italiani.", "Cerco un libro italiano.", "Deux livres se dit due libri."],
    reply: ["Deux sacs portent la mention « gruppo ». Comment vérifies-tu lequel vous appartient ?", "Qual è la nostra borsa?", "Quanto costa la borsa?", "Dov’è la fermata?", "Nostra indique que le sac est à votre groupe."],
    heard: ["I vostri libri sono nella borsa verde.", ["Écoute le libraire. Quel sac prends-tu ?", "La borsa verde.", "La borsa rossa.", "La borsa nera.", "Écoute la couleur à la fin de la phrase."]],
    endings: [["Un autre client tend la main vers votre sac. Précise à qui sont les livres.", "Questi sono i nostri libri.", "Questa è la mia cartolina.", "Quelli sono i tuoi biglietti.", "Accorde questi et nostri avec le pluriel libri."], ["Au retour, un ami te montre un seul livre qui t’appartient. Que lui dis-tu ?", "Questo è il mio libro.", "Questi sono i miei libri.", "Questa è la nostra borsa.", "Un seul livre appelle questo et mio."]],
  },
  verona: {
    opening: ["La visite commence à neuf heures. Comment demandes-tu à quelle heure on déjeune ?", "A che ora facciamo colazione?", "Dove pranziamo?", "Quanto dura la visita?", "Colazione désigne le premier repas de la journée."],
    reply: ["Ta sœur demande « Quando ti svegli? ». Dis-lui que tu te réveilles à sept heures.", "Mi sveglio alle sette.", "Mi sveglio da sette giorni.", "Vado a letto alle sette.", "Mi sveglio veut dire je me réveille."],
    heard: ["Ci vediamo alle otto e un quarto davanti al bar.", ["Écoute le message. Quand rejoins-tu le groupe ?", "8 h 15", "8 h 45", "7 h 15", "Un quarto correspond à quinze minutes."]],
    endings: [["La visite commence maintenant à 8 h 30. Avance le déjeuner à 7 h 45.", "Facciamo colazione alle sette e quarantacinque.", "Facciamo colazione alle otto e mezza.", "Ceniamo alle sette e quarantacinque.", "Propose le premier repas et conserve l’heure demandée."], ["La visite est reportée. Propose un déjeuner à 9 h 30.", "Facciamo colazione alle nove e mezza.", "Facciamo colazione alle nove meno un quarto.", "Pranziamo alle nove e mezza.", "E mezza ajoute une demi-heure."]],
  },
  napoli: {
    opening: ["Au comptoir, tu commandes un café et un verre d’eau pour ton amie.", "Un caffè e un bicchiere d’acqua, per favore.", "Due caffè, per favore.", "Un tè e un bicchiere di vino, per favore.", "Acqua est le mot pour l’eau."],
    reply: ["Le barista demande « Qui o da portare? ». Vous restez au comptoir.", "Qui al banco, grazie.", "Da portare, grazie.", "Il conto separato, grazie.", "Da portare signifie à emporter."],
    heard: ["Sono quattro euro e cinquanta in tutto.", ["Écoute le total. Quel montant lis-tu sur la caisse ?", "4,50 €", "5,40 €", "14,50 €", "Quattro indique les euros et cinquanta les centimes."]],
    endings: [["Tu donnes 10 € pour cette commande à 4,50 €. Combien dois-tu recevoir ?", "Cinque euro e cinquanta.", "Quattro euro e cinquanta.", "Sei euro e cinquanta.", "Complète 4,50 € jusqu’à 10 €."], ["Tu donnes 5 € pour la même commande à 4,50 €. Quel est le bon reste ?", "Cinquanta centesimi.", "Cinque euro.", "Quindici centesimi.", "Il reste un demi-euro."]],
  },
  firenze: {
    opening: ["Sur la place, tu cherches le musée à pied. Comment demandes-tu le chemin ?", "Mi scusi, come arrivo al museo a piedi?", "A che ora apre il museo?", "Quanto costa il museo?", "Come arrivo demande comment s’y rendre."],
    reply: ["On te dit « Vada sempre dritto ». Quel mouvement fais-tu ?", "Je continue tout droit.", "Je tourne à droite.", "Je fais demi-tour.", "Dritto signifie tout droit, destra signifie droite."],
    heard: ["Dopo il ponte giri a sinistra.", ["Écoute la suite. Où tournes-tu ?", "À gauche après le pont.", "À droite après le pont.", "À gauche avant le pont.", "Dopo veut dire après."]],
    endings: [["Ton amie se trouve encore avant le pont. Redonne-lui la dernière indication.", "Dopo il ponte gira a sinistra.", "Prima del ponte gira a sinistra.", "Dopo il ponte gira a destra.", "Conserve le repère et le côté."], ["Le musée a une entrée provisoire à droite de la pharmacie. Indique-la.", "L’ingresso è a destra della farmacia.", "L’ingresso è a sinistra della farmacia.", "La farmacia è dentro il museo.", "À droite de se dit a destra di."]],
  },
  siena: {
    opening: ["Au marché, la chemise est trop petite. Que demandes-tu ?", "Ha una taglia più grande?", "Ha un prezzo più basso?", "Ha una borsa più piccola?", "Taglia désigne la taille du vêtement."],
    reply: ["Tu veux acheter deux chemises bleues. Comment précises-tu ta commande ?", "Due camicie blu, per favore.", "Due scarpe blu, per favore.", "Una camicia bianca, per favore.", "Camicie est le pluriel de camicia."],
    heard: ["Una camicia costa quindici euro.", ["Écoute la marchande. Quel est le prix d’une chemise ?", "15 €", "50 €", "5 €", "Quindici veut dire quinze."]],
    endings: [["Tu prends les deux chemises à 15 € chacune. Confirme le total.", "Sono trenta euro in tutto?", "Sono quindici euro in tutto?", "Sono cinquanta euro in tutto?", "Deux fois quinze font trente."], ["Finalement, une amie en prend une troisième. Quel total confirmes-tu ?", "Sono quarantacinque euro in tutto?", "Sono trenta euro in tutto?", "Sono venticinque euro in tutto?", "Trois fois quinze font quarante-cinq."]],
  },
  venezia: {
    opening: ["Au quai, vérifie si le vaporetto va au Rialto.", "Questo vaporetto va a Rialto?", "Quanto costa Rialto?", "Dov’è il mio albergo?", "La question porte sur la destination."],
    reply: ["L’agent montre le pontile B. Où attends-tu ?", "À l’embarcadère B.", "À l’arrêt d’autobus B.", "Au guichet B.", "Un pontile est un embarcadère."],
    heard: ["La prossima fermata è Rialto.", ["Écoute l’annonce. Que fais-tu si tu veux aller au Rialto ?", "Je me prépare à descendre au prochain arrêt.", "Je descends deux arrêts plus tard.", "Je retourne au guichet.", "Prossima signifie prochaine."]],
    endings: [["Ton ami part de la gare. Aide-le à vérifier le quai pour le Rialto.", "Da quale pontile parte il vaporetto per Rialto?", "Quanto dura la visita a Rialto?", "Chi ha la chiave?", "Da quale pontile demande de quel quai part le bateau."], ["Au retour, tu veux confirmer que le bateau va à la gare. Que demandes-tu ?", "Questo vaporetto va alla stazione?", "La stazione è chiusa?", "Quanto costa la camera?", "Stazione est le nouveau point d’arrivée."]],
  },
  genova: {
    opening: ["Il fait beau. Invite une amie à marcher au port cet après-midi.", "Ti va di fare una passeggiata al porto oggi pomeriggio?", "Com’è andata ieri al porto?", "Quanto costa il porto?", "Ti va di formule une invitation."],
    reply: ["Elle répond « Volentieri! ». Qu’a-t-elle décidé ?", "Elle accepte avec plaisir.", "Elle remet la sortie à demain.", "Elle demande le prix.", "Volentieri exprime ici un accord."],
    heard: ["Oggi pomeriggio piove. Ci vediamo al museo?", ["Écoute son nouveau message. Où te propose-t-elle d’aller ?", "Au musée.", "Au port.", "Chez elle.", "Distingue la météo du lieu proposé."]],
    endings: [["Tu acceptes le musée et proposes quinze heures.", "Va bene, ci vediamo al museo alle tre del pomeriggio.", "Ci vediamo ieri al museo.", "No, oggi resto a casa.", "Utilise ci vediamo pour fixer le rendez-vous."], ["Tu es libre demain seulement. Propose de reporter la visite.", "Oggi non posso. Andiamo al museo domani?", "Oggi va benissimo, a tra poco!", "Ieri siamo andati al museo.", "Domani place la visite dans l’avenir."]],
  },
  torino: {
    opening: ["À l’hôtel, ta réservation est au nom de Rossi. Présente-toi à la réception.", "Ho una prenotazione a nome Rossi.", "Vorrei un biglietto per Rossi.", "Posso pagare il museo?", "Prenotazione désigne la réservation."],
    reply: ["On te demande « Per quante notti? ». Tu restes deux nuits.", "Per due notti.", "Alle due.", "Al secondo piano.", "Réponds par une durée, en nuits."],
    heard: ["La sua camera è al secondo piano, numero ventitré.", ["Écoute la réceptionniste. Où vas-tu ?", "Deuxième étage, chambre 23.", "Troisième étage, chambre 22.", "Deuxième étage, chambre 13.", "Écoute le numéro après piano."]],
    endings: [["La clé ne fonctionne pas. Demande de l’aide.", "La chiave non funziona. Mi può aiutare?", "La camera mi piace molto.", "A che ora è la colazione?", "Non funziona décrit le problème."], ["Tu pars tôt. Demande à quelle heure ouvre la réception.", "A che ora apre la reception?", "Dov’è la mia chiave?", "Quanto costa una notte?", "A che ora apre demande l’heure d’ouverture."]],
  },
  roma: {
    opening: ["Une amie te demande ce que tu as fait hier. Dis que tu as visité le musée.", "Ieri ho visitato il museo.", "Domani visiterò il museo.", "Adesso vado al museo.", "Ieri situe l’action dans le passé."],
    reply: ["Elle répond « Ho preso l’autobus ». Comment est-elle venue ?", "Elle a pris l’autobus.", "Elle va prendre le train.", "Elle a pris un taxi.", "Preso est le participe passé de prendere."],
    heard: ["Ieri ho mangiato una pizza dopo la visita.", ["Écoute son récit. Quand a-t-elle mangé ?", "Après la visite.", "Avant la visite.", "Pendant le trajet.", "Dopo indique ce qui vient après."]],
    endings: [["Tu écris une carte. Raconte ton repas d’hier.", "Ieri ho mangiato al mercato.", "Domani mangio al mercato.", "Vorrei mangiare al mercato.", "Ho mangiato raconte une action terminée."], ["Ajoute maintenant ton projet pour demain.", "Domani vado al mercato.", "Ieri ho fatto la spesa.", "L’anno scorso ho visto Roma.", "La carte passe cette fois au futur."]],
  },
  palermo: {
    opening: ["Tu quittes ta chambre le matin, mais ton train part le soir. Que demandes-tu à l’hôtel ?", "Posso lasciare qui i bagagli fino a stasera?", "Posso cambiare il biglietto del museo?", "Posso prenotare un tavolo per ieri?", "Lasciare i bagagli signifie laisser les bagages."],
    reply: ["On te donne un reçu. Que demandes-tu pour savoir où récupérer ta valise ?", "Dove posso ritirare la valigia?", "Quanto pesa la valigia?", "Dove compro una valigia?", "Ritirare veut dire venir chercher."],
    heard: ["Il deposito chiude alle diciotto, ma il treno parte alle diciannove.", ["Écoute le rappel. À quelle heure ferme la consigne ?", "18 h", "19 h", "20 h", "Distingue la fermeture du départ du train."]],
    endings: [["Ton ami propose 18 h 30 pour récupérer la valise. Explique le problème.", "È troppo tardi. Il deposito chiude alle diciotto.", "Va bene. Il deposito apre alle diciannove.", "Il treno parte a mezzogiorno.", "La consigne aura déjà fermé."], ["Tu récupères la valise à 17 h. Vérifie maintenant le départ de 19 h.", "Mi conferma che il treno parte alle diciannove?", "La valigia costa diciannove euro?", "Il deposito chiude alle diciassette?", "La nouvelle question porte sur le train."]],
  },
};

export function situationBeat(city: PassCity, run: RailRun): SituationBeat | null {
  if (city.round === "parma") return railBeat(run);
  if (run.step < 0 || run.step >= 4) return null;
  const scene = scenes[city.round];
  const steps = [scene.opening, scene.reply, scene.heard[1], scene.endings[run.attempt % 2]];
  const [prompt, right, second, third, hint] = steps[run.step];
  const options = [right, second, third];
  const shift = (run.step + run.attempt + Number(city.unit.slice(1))) % options.length;
  return { prompt, options: [...options.slice(shift), ...options.slice(0, shift)],
    answer: (options.length - shift) % options.length, hint, ...(run.step === 2 ? {transcript: scene.heard[0]} : {}) };
}
