import {tr as T, type Beat, type Practice, type Text} from "./practice";

type Recording = readonly [string,Text];
type Scene = {where:string;card:string;beats:Beat[]};
export type FieldMission = Practice & {image:string; id:string};
const audio = (i:number) => ({clip:"line-"+i});
const words = (text:string) => ({text});
function turn(task:Text,prompt:Beat["prompt"],choices:Beat["choices"],correct:0|1|2,hint:Text):Beat {
  return {task,prompt,choices,answer:choices[correct],hint};
}
function mission(id:string,targetLang:string,badge:string,image:string,title:Text,slip:Text,outcome:Text,recordings:Recording[],a:Scene,b:Scene):FieldMission {
  return {id,targetLang,badge,image,title,slip,outcome,key:"yo.practice."+id+".v1",finish:T("Mission réussie !","Mission complete!","¡Misión cumplida!"),
    lines:recordings.map(([target,translation],i)=>({id:"line-"+i,target,speechText:target,translation,isLearner:true})),
    visits:{guided:{city:a.where,guest:a.card,beats:a.beats},tomorrow:{city:b.where,guest:b.card,beats:b.beats}}};
}
const check=T("Compare la réponse avec ta fiche.","Compare the answer with your card.","Compara la respuesta con tu ficha.");
const fr = mission("fr-work","fr-CA","QC","images/yo/app/cat-talk.png",
  T("Ton premier quart de travail","Your first shift","Tu primer turno"),T("Badge de visite","Visitor badge","Credencial"),
  T("Tu sais te présenter, reconnaître le tutoiement et demander ton chemin au travail.","You introduced yourself, recognised an invitation to use tu, and found the meeting room.","Te presentaste, reconociste una invitación a tutear y encontraste la sala de reuniones."),
  [["Je commence aujourd’hui.",T("Je commence aujourd’hui.","I start today.","Empiezo hoy.")],
   ["Tu peux me tutoyer.",T("Tu peux me tutoyer.","You can use tu with me.","Puedes tutearme.")],
   ["Je cherche la salle de réunion.",T("Je cherche la salle de réunion.","I'm looking for the meeting room.","Busco la sala de reuniones.")]],
  {where:"Québec",card:"Camille · 9 h · réunion",beats:[
    turn(T("Présente-toi à l’accueil.","Introduce yourself at reception.","Preséntate en recepción."),words("Bienvenue dans l’équipe !"),["Je quitte aujourd’hui.","Je commence aujourd’hui.","À demain !"],1,T("C’est ton premier jour.","It's your first day.","Es tu primer día.")),
    turn(T("Ton collègue te propose quelque chose. Accepte.","Accept your colleague’s invitation.","Acepta la invitación de tu colega."),audio(1),["Merci, comment tu t’appelles ?","Je commence demain.","La salle est fermée."],0,T("Tutoyer quelqu’un, c’est lui dire « tu ».","Tutoyer means to address someone as tu.","Tutear es tratar a alguien de tú.")),
    turn(T("Trouve où se tient ton rendez-vous.","Find where your meeting is.","Averigua dónde es tu reunión."),words("Je peux t’aider ?"),["Je cherche la sortie.","Je cherche la cuisine.","Je cherche la salle de réunion."],2,check),
    turn(T("Suis l’indication du collègue.","Follow your colleague’s directions.","Sigue las indicaciones."),words("Pas ici : la réunion est dans la salle B."),["Salle A","Salle B","Accueil"],1,check)]},
  {where:"Lévis",card:"Camille · 8 h · formation",beats:[
    turn(T("Salue une responsable que tu ne connais pas.","Greet the new supervisor politely.","Saluda con cortesía a la nueva responsable."),words("Bonjour, je suis votre responsable."),["Salut, tu fais quoi ?","À demain !","Bonjour, enchanté de vous rencontrer."],2,check),
    turn(T("Une nouvelle collègue arrive. Qu’as-tu appris ?","A new colleague arrives. What did you learn?","Llega una compañera. ¿Qué has averiguado?"),audio(0),["C’est son premier jour.","Elle quitte son poste.","Elle cherche son sac."],0,check),
    turn(T("On a déplacé ta formation. Où vas-tu ?","Your training moved. Where do you go?","Tu formación cambió de sala. ¿Adónde vas?"),words("La formation n’est plus dans la salle B. Rendez-vous à l’accueil."),["Salle B","Accueil","Salle A"],1,check)]});

const en = mission("en-counter","en-CA","EN","images/yo/app/cat-explore.png",
  T("Un café avant le travail","Coffee before work","Un café antes del trabajo"),T("Ta commande","Your order","Tu pedido"),
  T("Tu as commandé, vérifié le prix et demandé comment payer.","You placed your order, checked the price and asked how to pay.","Hiciste el pedido, comprobaste el precio y preguntaste cómo pagar."),
  [["How much is it?",T("Combien ça coûte ?","How much is it?","¿Cuánto cuesta?")],
   ["Can I pay by card?",T("Puis-je payer par carte ?","Can I pay by card?","¿Puedo pagar con tarjeta?")],
   ["Sorry, can you repeat that?",T("Pardon, pouvez-vous répéter ?","Sorry, can you repeat that?","Perdón, ¿puede repetirlo?")]],
  {where:"Ottawa",card:"1 × coffee · oat milk · to go",beats:[
    turn(T("Commande ce qui figure sur ta fiche.","Order what’s on your slip.","Pide lo que indica tu ficha."),words("What can I get you?"),["A tea, please.","A coffee, please.","Two coffees, please."],1,check),
    turn(T("Précise le lait.","Tell the barista which milk.","Indica qué leche quieres."),words("Regular milk or oat milk?"),["Oat milk, please.","No milk, thanks.","Regular milk, please."],0,check),
    turn(T("Une autre cliente pose une question. Que doit lui donner le barista ?","Another customer asks a question. What does she need?","Otra clienta pregunta algo. ¿Qué necesita?"),audio(0),["The opening time.","The Wi-Fi code.","The price."],2,T("« How much » interroge sur le prix.","How much asks about the price.","How much pregunta por el precio.")),
    turn(T("Vérifie si ta carte est acceptée.","Check whether you can use your card.","Comprueba si aceptan tu tarjeta."),words("That’s four dollars."),["What time is it?","Can I pay by card?","Can I have oat milk?"],1,check)]},
  {where:"Toronto",card:"1 × tea · for here · cash",beats:[
    turn(T("La commande répétée est-elle la tienne ?","Correct the order being read back.","Corrige el pedido que te repiten."),words("One coffee to go?"),["Yes, two coffees.","No, one tea for here, please.","One tea to go."],1,check),
    turn(T("Le montant n’est pas clair. Fais-le répéter.","You missed the amount. Ask again.","No entendiste el importe. Pide que lo repitan."),words("That comes to…"),["Keep the change.","Oat milk, please.","Sorry, can you repeat that?"],2,check),
    turn(T("Écoute la question de ton ami. Réponds selon l’affiche « CASH ONLY ».","Answer your friend using the CASH ONLY sign.","Responde según el cartel « CASH ONLY »."),audio(1),["No, only cash.","Yes, only cards.","No, it’s free."],0,check)]});

const ja = mission("ja-workshop","ja","JP","images/yo/app/cat-culture.png",
  T("Rencontre à l’atelier","Meet your workshop partner","Conoce a tu pareja en el taller"),T("Ton badge","Your badge","Tu credencial"),
  T("Tu sais saluer un nouveau partenaire, te présenter et convenir de te revoir.","You greeted a new partner, introduced yourself and arranged to meet again.","Saludaste a una persona nueva, te presentaste y acordaste volver a verla."),
  [["はじめまして",T("Enchanté (première rencontre).","Nice to meet you (first meeting).","Mucho gusto (primer encuentro).")],
   ["よろしくお願いします",T("Au plaisir de travailler ensemble.","I look forward to working with you.","Será un gusto trabajar contigo.")],
   ["また明日",T("À demain.","See you tomorrow.","Hasta mañana.")]],
  {where:"東京 · Tokyo",card:"アレックス · Alex",beats:[
    turn(T("Aya se présente pour la première fois. Réponds.","Aya introduces herself for the first time. Reply.","Aya se presenta por primera vez. Responde."),audio(0),["おやすみなさい。","はじめまして。","また明日。"],1,T("Hajimemashite s’emploie à la première rencontre.","Use hajimemashite when meeting for the first time.","Usa hajimemashite al conocer a alguien.")),
    turn(T("Présente-toi avec ton badge.","Introduce yourself using your badge.","Preséntate con tu credencial."),words("あやです。お名前は？"),["あやです。","田中です。","アレックスです。"],2,check),
    turn(T("Vous allez travailler ensemble. Réponds au salut.","You’ll work together. Return the greeting.","Van a trabajar juntos. Devuelve el saludo."),audio(1),["こちらこそ、よろしくお願いします。","おやすみなさい。","さようなら。"],0,T("« Kochira koso » rend la politesse.","Kochira koso reciprocates a friendly greeting.","Kochira koso devuelve la cortesía.")),
    turn(T("Vous revenez demain. Prends congé.","You’ll both return tomorrow. Say goodbye.","Ambos vuelven mañana. Despídete."),words("明日もここで。"),["はじめまして。","また明日。","おめでとう。"],1,check)]},
  {where:"京都 · Kyoto",card:"サム · Sam",beats:[
    turn(T("Un nouveau binôme te demande ton nom.","Your new partner asks your name.","Tu nueva pareja pregunta tu nombre."),words("田中です。お名前は？"),["サムです。","田中です。","アレックスです。"],0,check),
    turn(T("Une amie te reconnaît. Choisis un salut de retrouvailles.","A friend recognises you. Greet her again.","Una amiga te reconoce. Salúdala de nuevo."),words("サムさん、お久しぶりです！"),["はじめまして。","お久しぶりです。","おやすみなさい。"],1,T("Il ne s’agit pas d’une première rencontre.","This is not your first meeting.","No es la primera vez que se ven.")),
    turn(T("À quand votre prochain rendez-vous ?","When will you meet again?","¿Cuándo volverán a verse?"),audio(2),["今日","来週","明日"],2,check)]});

const de = mission("de-tandem","de","DE","images/yo/german/berlin.webp",
  T("Un tandem à Berlin","A language exchange in Berlin","Un intercambio en Berlín"),T("Ton badge","Your name tag","Tu credencial"),
  T("Tu sais te présenter, faire ralentir la conversation et confirmer le lieu de rendez-vous.","You introduced yourself, slowed the conversation and confirmed where to meet.","Te presentaste, pediste que hablaran más despacio y confirmaste el lugar del encuentro."),
  [["Ich heiße Nora.",T("Je m’appelle Nora.","My name is Nora.","Me llamo Nora.")],
   ["Langsamer, bitte.",T("Plus lentement, s’il vous plaît.","More slowly, please.","Más despacio, por favor.")],
   ["Ich heiße Sami. Ich komme aus Kanada und wohne in Berlin.",T("Je m’appelle Sami, je viens du Canada et j’habite à Berlin.","My name is Sami. I come from Canada and live in Berlin.","Me llamo Sami. Soy de Canadá y vivo en Berlín.")]],
  {where:"Berlin",card:"Sami · Kanada",beats:[
    turn(T("Écoute ton binôme. Quel nom notes-tu ?","Listen to your partner. Which name goes on your list?","Escucha a tu pareja. ¿Qué nombre anotas?"),audio(0),["Sami","Nora","Lena"],1,check),
    turn(T("À toi de te présenter.","Introduce yourself in turn.","Ahora preséntate."),words("Und wie heißen Sie?"),["Ich heiße Sami.","Ich wohne in Kanada.","Ich heiße Nora."],0,check),
    turn(T("Le lieu a été dit trop vite. Interviens.","The meeting place went by too fast. Speak up.","Han dicho el lugar demasiado rápido. Intervén."),words("Wir treffen uns am…"),["Auf Wiedersehen!","Vielen Dank fürs Essen.","Langsamer, bitte."],2,T("« Langsamer » demande de ralentir.","Langsamer asks the speaker to slow down.","Langsamer pide que hablen más despacio.")),
    turn(T("Confirme le lieu que Nora répète.","Confirm the place Nora repeats.","Confirma el lugar que repite Nora."),words("Am Bahnhof. Nicht im Café."),["Im Café.","Am Bahnhof.","Im Park."],1,check)]},
  {where:"Hamburg",card:"Nora · Park · 10:00",beats:[
    turn(T("Ton nouveau partenaire se présente. Où habite-t-il ?","Your new partner introduces himself. Where does he live?","Tu nueva pareja se presenta. ¿Dónde vive?"),audio(2),["In Kanada.","In Hamburg.","In Berlin."],2,check),
    turn(T("Écoute sa demande et adapte ta façon de parler.","Listen to his request and adapt how you speak.","Escucha su petición y adapta cómo hablas."),audio(1),["Ja, ich spreche langsamer.","Ja, ich spreche schneller.","Nein, ich heiße Sami."],0,check),
    turn(T("Ton partenaire propose la gare. Corrige selon ton invitation.","Your partner suggests the station. Correct him using your invitation.","Tu pareja propone la estación. Corrige según tu invitación."),words("Also am Bahnhof um zehn?"),["Ja, am Bahnhof.","Nein, im Park um zehn.","Nein, im Café um elf."],1,check)]});

const pt = mission("pt-cafe","pt-BR","BR","images/yo/portuguese-br/salvador.webp",
  T("Au comptoir à Salvador","At the counter in Salvador","En la barra en Salvador"),T("Ta commande","Your order","Tu pedido"),
  T("Tu as précisé le lait et le sucre, puis vérifié l’addition.","You specified milk and sugar and checked the bill.","Indicaste la leche y el azúcar y comprobaste la cuenta."),
  [["Queria um café, por favor.",T("Je voudrais un café, s’il vous plaît.","I'd like a coffee, please.","Quisiera un café, por favor.")],
   ["Com leite, sem açúcar",T("Avec du lait, sans sucre.","With milk, no sugar.","Con leche, sin azúcar.")],
   ["O café custa seis reais e a água custa quatro reais. São dez reais.",T("Le café coûte six réaux et l’eau quatre. Dix en tout.","Coffee is six reais and water is four. Ten in total.","El café cuesta seis reales y el agua cuatro. Son diez reales.")]],
  {where:"Salvador",card:"1 café + leite · açúcar: 0",beats:[
    turn(T("Passe ta commande.","Place your order.","Haz tu pedido."),words("O que você vai querer?"),["Queria um chá.","Queria um café, por favor.","Só a conta, por favor."],1,check),
    turn(T("Le barista répète ta préférence. Quel verre prends-tu ?","The barista repeats your preference. Which cup is yours?","Repiten tu preferencia. ¿Qué vaso recoges?"),audio(1),["Café com leite, sem açúcar","Café preto com açúcar","Café sem leite"],0,T("« Com » ajoute ; « sem » retire.","Com adds something; sem leaves it out.","Com añade algo; sem lo excluye.")),
    turn(T("Refuse poliment le sucre proposé.","Politely decline the sugar.","Rechaza el azúcar con cortesía."),words("Quer açúcar?"),["Dois, por favor.","Sim, bastante.","Sem açúcar, por favor."],2,check),
    turn(T("Le café seul coûte six. Quelle somme prépares-tu ?","Coffee alone costs six. How much do you set aside?","Solo el café cuesta seis. ¿Cuánto preparas?"),words("Só o café? São seis reais."),["R$ 4","R$ 6","R$ 10"],1,check)]},
  {where:"Recife",card:"1 café preto + 1 água",beats:[
    turn(T("Le barista propose du lait. Corrige la commande.","The barista offers milk. Correct the order.","Te ofrecen leche. Corrige el pedido."),words("Um café com leite?"),["Sem leite, por favor.","Sim, com leite.","Duas águas."],0,check),
    turn(T("L’addition comprend les deux boissons. Quel total entends-tu ?","Both drinks are on the bill. What total do you hear?","La cuenta incluye las dos bebidas. ¿Qué total oyes?"),audio(2),["R$ 4","R$ 6","R$ 10"],2,check),
    turn(T("Ton ami ne prend finalement que l’eau. Quel est son montant ?","Your friend only wants the water after all. What is their share?","Al final, tu amigo solo quiere agua. ¿Cuál es su parte?"),words("Café: R$ 6 · Água: R$ 4"),["R$ 10","R$ 4","R$ 6"],1,check)]});

const zh = mission("zh-teahouse","zh-Hans","中文","images/yo/mandarin/tea.webp",
  T("À la maison de thé","At the teahouse","En la casa de té"),T("Ton plateau","Your tray","Tu bandeja"),
  T("Tu as distingué le thé de l’eau, commandé une tasse et corrigé une boisson.","You distinguished tea from water, ordered a cup and corrected a drink.","Distinguiste el té del agua, pediste una taza y corregiste una bebida."),
  [["请给我一杯茶。",T("Une tasse de thé, s’il vous plaît.","A cup of tea, please.","Una taza de té, por favor.")],
   ["请给我一杯水。",T("Un verre d’eau, s’il vous plaît.","A glass of water, please.","Un vaso de agua, por favor.")],
   ["好。我想喝茶。",T("D’accord. J’ai envie de thé.","Okay. I’d like some tea.","De acuerdo. Quiero tomar té.")]],
  {where:"北京 · Běijīng",card:"A · 茶 chá",beats:[
    turn(T("Écoute la commande et sélectionne la bonne étiquette.","Listen and pick the right label.","Escucha y elige la etiqueta correcta."),audio(0),["水 shuǐ","茶 chá","米饭 mǐfàn"],1,T("Chá (茶) désigne le thé. Shuǐ (水) désigne l’eau.","Chá (茶) is tea. Shuǐ (水) is water.","Chá (茶) es té. Shuǐ (水) es agua.")),
    turn(T("Commande une tasse pour ton plateau.","Order one cup for your tray.","Pide una taza para tu bandeja."),words("您想喝什么？"),["请给我一杯茶。","请给我一杯水。","我要米饭。"],0,check),
    turn(T("Ton ami commande ensuite. Que lui passes-tu ?","Your friend orders next. What do you pass over?","Tu amigo pide después. ¿Qué le pasas?"),audio(1),["茶","米饭","水"],2,check),
    turn(T("Le serveur confond les plateaux. Rappelle ta commande.","The server mixes up the trays. Restate your order.","El camarero confunde las bandejas. Repite tu pedido."),words("您的水。"),["对，我要水。","我要茶，谢谢。","我要两碗米饭。"],1,check)]},
  {where:"上海 · Shànghǎi",card:"A · 水 shuǐ / B · 茶 chá",beats:[
    turn(T("Commande cette fois pour le plateau A.","This time order for tray A.","Esta vez pide para la bandeja A."),words("您好！您想喝什么？"),["请给我一杯水。","请给我一杯茶。","两杯茶。"],0,check),
    turn(T("Écoute l’autre client. Quel plateau lui tendras-tu ?","Listen to the other customer. Which tray will you give them?","Escucha al otro cliente. ¿Qué bandeja le darás?"),audio(2),["A · 水","A + B","B · 茶"],2,check),
    turn(T("Le serveur t’apporte le thé destiné à B. Que dis-tu ?","You’re handed B’s tea. What do you say?","Te dan el té de B. ¿Qué dices?"),words("您的茶。"),["对，两杯茶。","不是茶，我要水。","不用了，我不喝水。"],1,check)]});

export const fieldMissions:readonly FieldMission[] = [fr,en,ja,de,pt,zh];
