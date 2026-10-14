import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { reconcileLearnerWaitlistBooking } from '@/lib/learnerWaitlistConversion';
const id='11111111-1111-4111-8111-111111111111';
const rows: Record<string, Record<string, unknown>[]>={
 bookings:[{id,student_id:id,teacher_id:id,created_at:'2026-10-01',slot_date:'2026-11-02',time_slot:'9h00',duration_minutes:60,teaching_mode:'person'}],
 teachers_public:[{id,user_id:id,name:'Fixture',discipline:'piano',category:'music',city:'Saint-Georges',teaching_mode:'person',price_per_lesson:45}],
 learner_demand_leads:[{id,subject:'piano',city:'Saint-Georges',requested_format:'in_person',availability_preference:'weekday_day',email_normalized:'verified@example.test',alert_consent_at:'2026-09-01',adult_contact_confirmed:true,status:'open',created_at:'2026-09-01'}],
};
let verified=true; const links=new Set<string>();
const admin={ auth:{admin:{getUserById:async()=>({data:{user:{email:'verified@example.test',email_confirmed_at:verified?'2026-01-01':null}},error:null})}},
 from(table:string){
  const filters:((row:Record<string,unknown>)=>boolean)[]=[];
  const result=()=>({data:(rows[table]??[]).filter(row=>filters.every(fn=>fn(row))),error:null});
  const q={select(){return q;},eq(key:string,value:unknown){filters.push(row=>row[key]===value);return q;},neq(key:string,value:unknown){filters.push(row=>row[key]!==value);return q;},not(key:string){filters.push(row=>row[key]!=null);return q;},lte(key:string,value:string){filters.push(row=>String(row[key])<=value);return q;},in(){return q;},order(){return q;},
    maybeSingle(){const r=result();return Promise.resolve({...r,data:r.data[0]??null});},
    upsert(data:{lead_id:string;booking_id:string}[]){data.forEach(row=>links.add(`${row.lead_id}:${row.booking_id}`));return Promise.resolve({error:null});},
    then(resolve:(v:unknown)=>unknown){return Promise.resolve(resolve(result()));}};return q;
 }} as unknown as SupabaseClient;
async function main(){
 await reconcileLearnerWaitlistBooking(admin,id); assert.equal(links.size,1);
 await reconcileLearnerWaitlistBooking(admin,id); assert.equal(links.size,1);
 for(const patch of [{subject:'espagnol'},{city:'Quebec'},{availability_preference:'weekend'},{requested_format:'online'},{status:'closed'},{created_at:'2026-12-01'}]){
  const original={...rows.learner_demand_leads[0]}; links.clear(); Object.assign(rows.learner_demand_leads[0],patch);
  await reconcileLearnerWaitlistBooking(admin,id);assert.equal(links.size,0,JSON.stringify(patch));rows.learner_demand_leads[0]=original;
 }
 verified=false;await reconcileLearnerWaitlistBooking(admin,id);assert.equal(links.size,0);
 console.log('PASS verified identity, exact need, local/online, preference, chronology, withdrawal and retry deduplication');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
