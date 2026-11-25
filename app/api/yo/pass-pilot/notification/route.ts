import {pilotEnabled} from "@/lib/yo/passPilot/account.server";
import {notification,offerVersion,reconcile} from "@/lib/yo/passPilot/stripe.server";
export async function POST(req:Request){
  if(!pilotEnabled())return new Response(null,{status:404});
  let e;try{e=notification(await req.text(),req.headers.get("stripe-signature")??"");}catch{return new Response(null,{status:400});}
  if(e.livemode)return new Response(null,{status:400});
  if(e.type==="payment_intent.succeeded"||e.type==="payment_intent.canceled"||e.type==="charge.refunded"){
    const m=e.data.object.metadata;
    if(m?.pilot===offerVersion&&m.account&&m.order)await reconcile(m.account,m.order);
  }
  return new Response(null,{status:204});
}
