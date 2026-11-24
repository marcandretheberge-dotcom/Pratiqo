import Stripe from "stripe";
import {account,pilotEnabled} from "./account.server";
import {fulfill,order,prices,reverse,type Order,type Sku} from "./wallet";

export const offerVersion="yo_it_20261123";
function provider(){
  const key=process.env.YO_PASS_TEST_KEY;
  if(!pilotEnabled()||!key||! /^(sk|rk)_test_/.test(key))throw Error("test_provider_unavailable");
  return new Stripe(key,{maxNetworkRetries:1});
}
export async function getPrice(sku:Sku){
  const result=await provider().prices.list({lookup_keys:[offerVersion+"_"+sku],active:true,limit:1});
  const p=result.data[0];
  if(!p||p.livemode||p.type!=="one_time"||p.currency!=="cad"||p.unit_amount!==prices[sku]||p.metadata.pilot!==offerVersion)throw Error("test_price_missing");
  return p;
}
export async function prepare(uid:string,sku:Sku,nonce:string){
  const p=await getPrice(sku),o=await account(uid,w=>order(w,sku,nonce,Date.now()));
  if(o.status!=="waiting"||o.intent)return o;
  if(o.amount===0){await account(uid,w=>fulfill(w,o.id,Date.now()));return {...o,status:"paid"};}
  // Local test receipt only. No customer-supplied card data, shipping, email or live tax setup.
  const intent=await provider().paymentIntents.create({amount:o.amount,currency:"cad",
    automatic_payment_methods:{enabled:true,allow_redirects:"never"},
    metadata:{pilot:offerVersion,account:uid,order:o.id,sku,price:p.id}},
    {idempotencyKey:offerVersion+":"+uid+":"+o.id});
  return account(uid,w=>{const target=w.orders.find(x=>x.id===o.id)!;target.intent=intent.id;target.priceId=p.id;return target;});
}
export async function reconcile(uid:string,id:string,action:"read"|"confirm"|"cancel"="read"):Promise<string>{
  const o:Order=await account(uid,w=>{const o=w.orders.find(x=>x.id===id);if(!o)throw Error("unknown_order");return o;});
  if(!o.intent){
    if(o.status==="waiting"&&action!=="read"){
      const prepared=await prepare(uid,o.sku,o.id);
      if(prepared.intent)return reconcile(uid,id,action);
      return prepared.status;
    }
    return o.status;
  }
  const api=provider();let pi=await api.paymentIntents.retrieve(o.intent,{expand:["latest_charge"]});
  const matches=(i:Stripe.PaymentIntent)=>!i.livemode&&i.currency==="cad"&&i.amount===o.amount&&i.metadata.account===uid&&i.metadata.pilot===offerVersion&&i.metadata.order===id&&i.metadata.sku===o.sku&&i.metadata.price===o.priceId;
  if(!matches(pi))throw Error("receipt_mismatch");
  if(action==="confirm"&&pi.status==="requires_payment_method"&&o.status==="waiting"){
    await api.paymentIntents.confirm(pi.id,{payment_method:"pm_card_visa"},{idempotencyKey:offerVersion+":confirm:"+pi.id});
    pi=await api.paymentIntents.retrieve(pi.id,{expand:["latest_charge"]});
  }else if(action==="cancel"&&["requires_payment_method","requires_confirmation","requires_action"].includes(pi.status)){
    pi=await api.paymentIntents.cancel(pi.id);
  }
  if(!matches(pi))throw Error("receipt_mismatch");
  if(pi.status==="succeeded"&&pi.amount_received===o.amount){
    const charge=pi.latest_charge;if(!charge||typeof charge==="string"||!charge.paid||charge.livemode)throw Error("unverified_charge");
    await account(uid,w=>{fulfill(w,id,charge.created*1000);if(charge.amount_refunded>0||charge.disputed)reverse(w,id);});
  }else if(pi.status==="canceled")await account(uid,w=>{const x=w.orders.find(o=>o.id===id)!;if(x.status==="waiting")x.status="cancelled";});
  return pi.status;
}
export function notification(body:string,sig:string){
  const secret=process.env.YO_PASS_TEST_WEBHOOK;
  if(!secret)throw Error("disabled");return provider().webhooks.constructEvent(body,sig,secret);
}
