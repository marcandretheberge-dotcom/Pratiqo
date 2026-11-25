import assert from "node:assert/strict";
import {build} from "esbuild";
import Module from "node:module";
import path from "node:path";
// Bundle the real handler, mocking only its external authentication/DB boundary.
const state={valid:true,teacher:true,calls:[]};
global.__zoneRouteTest={
 createClient:()=>({auth:{getUser:async token=>({data:{user:state.valid&&token==='valid'?{id:'owner-a'}:null},error:state.valid?null:{message:'invalid'}})}}),
 getSupabaseAdmin:()=>({from(table){
  if(table==='teacher_teaching_zones'){
   let orders=0;
   return{select(){return this;},eq(column,value){state.calls.push({column,value});if(column==='teacher_id')assert.equal(value,'teacher-a');return this;},order(){return ++orders===2?Promise.resolve({data:[],error:null}):this;}};
  }
  assert.equal(table,'teachers');return{select(){return this;},eq(column,value){state.calls.push({column,value});assert.equal(column,'user_id');assert.equal(value,'owner-a');return this;},async maybeSingle(){return{data:state.teacher?{id:'teacher-a'}:null,error:null};}};
 },async rpc(name,args){state.calls.push({name,args});return{data:args.p_zones.map(z=>({...z,id:'zone-a',teacher_id:args.p_teacher_id})),error:null};}}),
};
process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.invalid';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='synthetic';
const virtual={name:'mock-zone-boundaries',setup(b){b.onResolve({filter:/^(@supabase\/supabase-js|@\/lib\/supabaseAdmin)$/},a=>({path:a.path,namespace:'zone-mock'}));b.onLoad({filter:/.*/,namespace:'zone-mock'},a=>({contents:a.path.includes('supabaseAdmin')?'export const getSupabaseAdmin = globalThis.__zoneRouteTest.getSupabaseAdmin;':'export const createClient = globalThis.__zoneRouteTest.createClient;',loader:'js'}));}};
const zone={labelPublic:'Québec',city:'Québec',countryCode:'CA',isActive:false};
const request=(body,auth='Bearer valid')=>new Request('https://example.invalid/api/teacher/teaching-zones?teacherId=victim',{method:'PUT',headers:{'content-type':'application/json',...(auth?{authorization:auth}:{})},body:JSON.stringify(body)});
async function main(){
 const output=await build({entryPoints:['app/api/teacher/teaching-zones/route.ts'],bundle:true,platform:'node',format:'cjs',write:false,external:['next/server','zod'],plugins:[virtual]});
 const filename=path.resolve('tests/teacherZones/runtime-handler.cjs');
 const mod=new Module(filename);mod.filename=filename;mod.paths = Module._nodeModulePaths(path.dirname(filename));mod._compile(output.outputFiles[0].text,filename);
 assert.equal((await mod.exports.PUT(request({zones:[zone]},''))).status,401);assert.equal(state.calls.length,0);
 state.valid=false;assert.equal((await mod.exports.PUT(request({zones:[zone]}))).status,401);assert.equal(state.calls.length,0);state.valid=true;
 state.teacher=false;assert.equal((await mod.exports.PUT(request({zones:[zone]}))).status,404);assert.ok(!state.calls.some(c=>c.name));state.teacher=true;state.calls=[];
 assert.equal((await mod.exports.PUT(request({teacherId:'victim',zones:[zone]}))).status,400);assert.ok(!state.calls.some(c=>c.name));state.calls=[];
 assert.equal((await mod.exports.PUT(request({zones:[zone]}))).status,200);
 const call=state.calls.find(c=>c.name);assert.equal(call.name,'replace_teacher_teaching_zones');assert.equal(call.args.p_teacher_id,'teacher-a');assert.equal(call.args.p_zones[0].is_active,false);
 state.calls=[];
 const response=await mod.exports.GET(new Request('https://example.invalid/api/teacher/teaching-zones?teacherId=victim',{headers:{authorization:'Bearer valid'}}));
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{zones:[]});
 assert.ok(state.calls.some(c=>c.column==='teacher_id'&&c.value==='teacher-a'));
 console.log('PASS real GET/PUT handlers: missing/invalid auth, missing owner, foreign target rejection, owner-only read/RPC, inactive payload');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{delete global.__zoneRouteTest;});
