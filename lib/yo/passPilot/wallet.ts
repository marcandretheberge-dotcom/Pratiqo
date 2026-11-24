// Test pilot only. Monetary amounts are pre-tax Canadian cents, never marketplace credits.
export const prices = {single:349, explorer:899, italy:1999} as const;
export type Sku = keyof typeof prices;
export const stage = "it:u02:rail";
export type Unit = {id:string; value:number; used?:{stage:string; at:number}; settled?:string};
export type Order = {id:string; sku:Sku; amount:number; creditIds:string[]; at:number; status:"waiting"|"paid"|"refunded"|"cancelled"; paidAt?:number; intent?:string; priceId?:string};
import type {RailRun} from "./rail";
export type Wallet = {units:Unit[]; orders:Order[]; wins:string[]; completed:string[]; plays:string[]; run?:RailRun};
export const freshWallet = ():Wallet=>({units:Array.from({length:5},(_,i)=>({id:"welcome:"+i,value:0})),orders:[],wins:[],completed:[],plays:[]});
export const untilYear=(at:number,delta:number)=>{
  const d=new Date(at),m=d.getUTCMonth();d.setUTCFullYear(d.getUTCFullYear()+delta);
  if(d.getUTCMonth()!==m)d.setUTCDate(0);return +d;
};
const refunded=(w:Wallet,u:Unit)=>w.orders.some(o=>o.status==="refunded"&&u.id.startsWith(o.id+":"));
const valid=(w:Wallet)=>w.units.filter(u=>!refunded(w,u));
export const balance=(w:Wallet)=>valid(w).filter(u=>!u.used).length;
export const covered=(w:Wallet,now:number)=>w.orders.some(o=>o.sku==="italy"&&o.status==="paid"&&untilYear(o.paidAt!,1)>now);
export const owned=(w:Wallet,s:string,now=Date.now())=>valid(w).some(u=>u.used?.stage===s&&untilYear(u.used.at,1)>now);
export function quote(w:Wallet,now:number){
  const oldest=untilYear(now,-1);
  const units=valid(w).filter(u=>u.value>0&&!u.settled&&u.used?.stage.startsWith("it:")&&u.used.at>=oldest);
  return {amount:Math.max(0,prices.italy-units.reduce((n,u)=>n+u.value,0)),creditIds:units.map(u=>u.id)};
}
export function cheapest(w:Wallet,remaining:number,now:number){
  const needed=Math.max(0,remaining-balance(w));
  if(!needed||covered(w,now))return {amount:0,kind:"free"};
  const packs=Math.floor(needed/3), rest=needed%3;
  const unitCost=packs*prices.explorer+Math.min(rest*prices.single,prices.explorer);
  const upgrade=quote(w,now).amount;
  return upgrade<unitCost?{amount:upgrade,kind:"italy"}:{amount:unitCost,kind:packs?"mixed":"single"};
}
export function win(w:Wallet,s:string){if(!w.wins.includes(s))w.wins.push(s);}
export function redeem(w:Wallet,s:string,at:number){
  if(!w.wins.includes(s))throw Error("checkpoint");
  if(owned(w,s,at)||(s.startsWith("it:")&&covered(w,at)))return;
  if(w.orders.some(o=>o.sku==="italy"&&o.status==="waiting"))throw Error("purchase_pending");
  const unit=valid(w).filter(u=>!u.used).sort((a,b)=>a.value-b.value)[0];if(!unit)throw Error("empty");
  unit.used={stage:s,at};
}
export function order(w:Wallet,sku:Sku,id:string,at:number){
  const previous=w.orders.find(o=>o.id===id);
  if(previous){if(previous.sku!==sku)throw Error("wrong_offer");return previous;}
  const waiting=w.orders.find(o=>o.status==="waiting");
  if(waiting){if(waiting.sku!==sku)throw Error("purchase_pending");return waiting;}
  if(sku==="italy"&&covered(w,at))throw Error("already_owned");
  const {amount,creditIds}=sku==="italy"?quote(w,at):{amount:prices[sku],creditIds:[]};
  const o:Order={id,sku,amount,creditIds,at,status:"waiting"};w.orders.push(o);return o;
}
// Called only after the server verifies the test provider's paid receipt (or a zero-cost quote).
export function fulfill(w:Wallet,id:string,at:number){
  const o=w.orders.find(x=>x.id===id);if(!o)throw Error("unknown_order");
  if(o.status==="paid"||o.status==="refunded")return;if(o.status!=="waiting")throw Error("closed_order");
  if(o.sku==="italy"){
    const current=quote(w,at);
    if(current.amount!==o.amount||o.creditIds.some(id=>!current.creditIds.includes(id)))throw Error("quote_changed_review");
    for(const u of w.units)if(o.creditIds.includes(u.id))u.settled=id;
  }else{
    const count=o.sku==="explorer"?3:1;
    for(let i=0;i<count;i++)w.units.push({id:id+":"+i,value:Math.floor(o.amount/count)+(i<o.amount%count?1:0)});
  }
  o.status="paid";o.paidAt=at;
}
// A refund freezes the affected purchase, even a partial refund, pending manual reconciliation.
// Keep settled upgrade credits and historical learning; never mint change from a reversal.
export function reverse(w:Wallet,id:string){const o=w.orders.find(x=>x.id===id);if(o?.status==="paid")o.status="refunded";}
