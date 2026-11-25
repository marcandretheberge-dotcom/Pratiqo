export type Interest="travel"|"history"|"art";
export type RailRun={step:number; attempt:number; mistakes:number; interest:Interest};
const contexts={travel:"retrouver ton hôte",art:"rejoindre le musée pour une visite",history:"rejoindre une promenade dans le centre historique"};
export function railBeat(run:RailRun){
  const swap=run.attempt%2===1, departure=swap?"10 h 25":"09 h 40", train=swap?"R 426":"R 412";
  const steps=[
    {prompt:"À la gare de Bologne, tu vas à Parme pour "+contexts[run.interest]+". Ton billet indique "+departure+". Quel départ choisis-tu ?", options:["Parma · "+departure+" · "+train,"Parma · 08 h 55 · R 410","Modena · "+departure+" · R 409"],answer:0,hint:"Compare la destination et l’heure, pas seulement le nom de la ville."},
    {prompt:"La voie imprimée semble avoir changé. Que demandes-tu au guichet ?",options:["Quanto dura il viaggio?","Da quale binario parte il treno?","Quanto costa il biglietto?"],answer:1,hint:"Binario signifie « voie ». Quanto dura demande la durée.",audio:"ask"},
    {prompt:"Ton billet indique la voie "+(swap?"deux":"cinq")+". Écoute la nouvelle annonce. Où vas-tu ?",options:["Binario cinque","Binario due","Binario tre"],answer:2,hint:"L’annonce remplace la voie imprimée sur ton billet.",audio:"platform",transcript:"Il treno parte dal binario tre."},
    {prompt:"Un autre voyageur te demande : « È questo il treno per Modena? » Tu montes dans celui pour Parme. Aide-le.",options:["Sì, per Modena.","No, questo treno va a Parma.","Un biglietto di ritorno, grazie."],answer:1,hint:"Distingue la destination du train de celle que la personne cherche."},
  ];
  const b=steps[run.step];if(!b)return null;
  const offset=(run.step+run.attempt)%b.options.length;
  return {...b,options:[...b.options.slice(offset),...b.options.slice(0,offset)],answer:(b.answer-offset+b.options.length)%b.options.length};
}
