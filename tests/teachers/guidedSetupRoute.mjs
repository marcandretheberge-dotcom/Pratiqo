import assert from "node:assert/strict";
import {build} from "esbuild";
import Module from "node:module";
import path from "node:path";
const state={visible:true,action:'request',failed:false,calls:[]};
global.__guidedTest={
 createClient:()=>({auth:{getUser:async token=>({data:{user:token==='valid'?{id:'owner'}:null},error:null})}}),
 getSupabaseAdmin:()=>({from(table){assert.ok(['teachers','teachers_public'].includes(table));return {select(){return this;},eq(key,value){state.calls.push([table,key,value]);assert.equal(value,table==='teachers'?'owner':'owned-teacher');return this;},async maybeSingle(){return{data:table==='teachers'||state.visible?{id:'owned-teacher'}:null,error:state.failed?{}:null};}};}}),
 getTeacherListingCapabilities:async(_admin,ids)=>{assert.deepEqual(ids,['owned-teacher']);return {'owned-teacher':state.action?{action:state.action,hasSlot:state.action!=='contact'}:null};},
};
const virtual={name:'mock-guided',setup(b){b.onResolve({filter:/^(@supabase\/supabase-js|@\/lib\/supabaseAdmin|@\/lib\/teachers\/listingBookability)$/},a=>({path:a.path,namespace:'guided'}));b.onLoad({filter:/.*/,namespace:'guided'},a=>({contents:`export const ${a.path.includes('supabase-js')?'createClient':a.path.includes('supabaseAdmin')?'getSupabaseAdmin':'getTeacherListingCapabilities'} = globalThis.__guidedTest.${a.path.includes('supabase-js')?'createClient':a.path.includes('supabaseAdmin')?'getSupabaseAdmin':'getTeacherListingCapabilities'};`,loader:'js'}));}};
async function main(){
 const result=await build({entryPoints:['app/api/teacher/setup-status/route.ts'],bundle:true,platform:'node',format:'cjs',write:false,external:['next/server'],plugins:[virtual]});
 const filename=path.resolve('tests/teachers/guided-handler.cjs');const mod=new Module(filename);mod.filename=filename;mod.paths = Module._nodeModulePaths(path.dirname(filename));mod._compile(result.outputFiles[0].text,filename);
 const request=(token='valid')=>new Request('https://example.invalid/api/teacher/setup-status?teacherId=victim',{headers:token?{authorization:`Bearer ${token}`}:{}});
 assert.equal((await mod.exports.GET(request(''))).status,401);assert.equal((await mod.exports.GET(request('bad'))).status,401);assert.equal(state.calls.length,0);
 for(const action of ['book','request','contact',null]){state.action=action;const res=await mod.exports.GET(request());assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'private, no-store');assert.deepEqual(await res.json(),{state:action||'unknown'});}
 state.visible=false;assert.deepEqual(await (await mod.exports.GET(request())).json(),{state:'not_public'});
 state.failed=true;assert.equal((await mod.exports.GET(request())).status,503);
 console.log('PASS real status handler: authentication, ownership, tampered teacher ID ignored, visibility, paid/request/contact/unknown, no-store, data error');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>delete global.__guidedTest);
