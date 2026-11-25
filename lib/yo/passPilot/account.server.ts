import {getSupabaseAdmin} from "@/lib/supabaseAdmin";
import {freshWallet,type Wallet} from "./wallet";

export function pilotEnabled(){
  try {const u=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL??"");
    return process.env.YO_PASS_LOCAL==="1"&&!process.env.VERCEL&&u.protocol==="http:"&&["localhost","127.0.0.1"].includes(u.hostname);
  }catch{return false;}
}
// A failed compare-and-swap rereads and reapplies the pure transition. Never call Stripe inside it.
export async function account<T>(uid:string,change:(w:Wallet)=>T):Promise<T>{
  if(!pilotEnabled())throw Error("disabled");
  const db=getSupabaseAdmin().from("yo_pass_pilot_accounts");
  for(let retry=0;retry<8;retry++){
    const r=await db.select("wallet,revision").eq("user_id",uid).maybeSingle();
    if(r.error)throw Error("storage");
    const w:Wallet=r.data?.wallet??freshWallet(),before=JSON.stringify(w),result=change(w);
    if(!r.data){const i=await db.insert({user_id:uid,wallet:w});if(!i.error)return result;if(i.error.code==="23505")continue;throw Error("storage");}
    if(before===JSON.stringify(w))return result;
    const next=await db.update({wallet:w,revision:r.data.revision+1}).eq("user_id",uid).eq("revision",r.data.revision).select("revision");
    if(next.error)throw Error("storage");if(next.data.length)return result;
  }
  throw Error("busy_retry");
}
