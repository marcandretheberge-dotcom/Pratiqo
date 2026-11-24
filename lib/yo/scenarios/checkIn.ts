import { arrivalListeningScenes } from "../dominicanArrivalListening";
import {progressFor,tr,type Mode,type Beat,type Practice} from "./practice";
export {tr,modes,fresh,type Locale,type Mode,type State} from "./practice";
const scene = arrivalListeningScenes.hotel;
export const lines = [...scene.lines, ...scene.practiceLines];
export function line(id:string) {
  const found = lines.find(l=>l.id===id);
  if(!found) throw Error("Unknown hotel dialogue line: "+id);
  return found;
}
const said=(id:string)=>line("hotel-"+id).target;
const passport=tr("On te demande un document : tends-le et réponds poliment.","You were asked for a document. Hand it over with a polite reply.","Te piden un documento. Entrégalo con una respuesta cortés.");
const repeat=tr("Si deux informations ne concordent pas, demande de répéter avant de partir.","If two details disagree, ask the receptionist to repeat before leaving.","Si dos datos no coinciden, pide que te lo repitan antes de irte.");
export const visits:Record<Mode,{guest:string; city:string; beats:Beat[]}> = {
  guided:{guest:"Alex Martín",city:"Santo Domingo",beats:[
    {task:tr("Annonce ton arrivée.","Start your check-in.","Inicia el registro."),prompt:{clip:"hotel-01"},
      choices:[said("08"),said("02"),said("06")],answer:said("02"),hint:tr("Réponds au salut et dis que tu as une réservation.","Return the greeting and say you have a reservation.","Devuelve el saludo y di que tienes una reservación.")},
    {task:tr("Donne le nom sur ta réservation.","Give the name on your reservation.","Da el nombre de tu reservación."),prompt:{clip:"hotel-03"},
      choices:[said("04"),"A nombre de Ana Gil.",said("06")],answer:said("04"),hint:tr("« A nombre de » introduit le nom inscrit sur ta fiche.","“A nombre de” introduces the name printed on your booking slip.","«A nombre de» introduce el nombre que figura en tu ficha.")},
    {task:tr("Réponds à la réceptionniste.","Answer the receptionist.","Responde en recepción."),prompt:{clip:"hotel-05"},
      choices:[said("04"),said("08"),said("06")],answer:said("06"),hint:passport},
    {task:tr("Le numéro t’a échappé. Fais répéter la réceptionniste.","You missed the room number. Ask to hear it again.","No entendiste el número. Pide que te lo repitan."),prompt:{text:"Su habitación es la…"},
      choices:[said("repeat"),said("06"),said("04")],answer:said("repeat"),hint:repeat},
    {task:tr("Prends la bonne clé.","Pick up your room key.","Recoge la llave correcta."),prompt:{clip:"hotel-07"},
      choices:["240","402","204"],answer:"204",hint:tr("« Doscientos cuatro » veut dire deux cent quatre.","“Doscientos cuatro” means two hundred and four.","Doscientos más cuatro: no son doscientos cuarenta.")},
    {task:tr("Demande le mot de passe du wifi.","Ask for the Wi-Fi password.","Pide la contraseña del wifi."),prompt:{text:"Wifi · Red de huéspedes"},
      choices:[said("08"),said("repeat"),said("02")],answer:said("08"),hint:tr("« Contraseña » désigne le mot de passe. Pour faire répéter, on dit « repetir ».","“Contraseña” is a password. To ask for repetition, use “repetir”.","«Contraseña» es la clave; «repetir» sirve para pedir una aclaración.")}
  ]},
  tomorrow:{guest:"Mar Solís",city:"Punta Cana",beats:[
    {task:tr("Présente ta nouvelle réservation.","Check in under the new booking.","Presenta la nueva reservación."),prompt:{text:"Buenas tardes. ¿A nombre de quién está la reservación?"},
      choices:["Sí, aquí está.","A nombre de Mar Solís.",said("04")],answer:"A nombre de Mar Solís.",hint:tr("Vérifie le nom sur la fiche de ce séjour.","Check the name on this stay’s booking slip.","Comprueba el nombre en la ficha de esta estancia.")},
    {task:tr("Tu viens de donner ton nom. Que réponds-tu maintenant ?","You’ve given your name. What do you say now?","Ya diste tu nombre. ¿Qué respondes ahora?"),prompt:{clip:"hotel-05"},
      choices:[said("06"),"A nombre de Mar Solís.",said("08")],answer:said("06"),hint:passport},
    {task:tr("Ta clé porte le numéro 402. L’annonce correspond-elle ? Que dis-tu ?","Your key says 402. Does that match what you hear? What do you say?","Tu llave dice 402. ¿Coincide con el aviso? ¿Qué dices?"),prompt:{clip:"hotel-07"},
      choices:["Gracias, la 402.",said("08"),said("repeat")],answer:said("repeat"),hint:repeat},
    {task:tr("La réception vérifie le dossier. Avec quelle clé repars-tu ?","The desk checks the booking. Which key do you leave with?","En recepción revisan la reservación. ¿Qué llave te llevas?"),prompt:{text:"Disculpe, Mar. La 204 no. Su habitación es la 402."},
      choices:["204","420","402"],answer:"402",hint:tr("Écarte le numéro que la réception vient de corriger.","Rule out the room the receptionist just corrected.","Descarta el número que acaban de corregir.")},
  ]}
};
export const key="yo.review.es.do.hotel.check-in.v1";
export const {restore,ready,submit}=progressFor(visits);
export const hotel:Practice={key,targetLang:"es",badge:"RD",title:tr("À la réception","At the front desk","En recepción"),slip:tr("Réservation fictive","Practice reservation","Reservación ficticia"),finish:tr("Ta clé est prête !","Here’s your key!","¡Aquí está tu llave!"),outcome:tr("Tu as donné le nom de la réservation, fait répéter un numéro et trouvé ta chambre.","You checked in under the right name, asked for repetition and found your room.","Diste el nombre de la reservación, pediste que repitieran el número y encontraste tu habitación."),visits,lines};
