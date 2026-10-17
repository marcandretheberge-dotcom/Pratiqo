const assert = require('node:assert/strict');
const {build} = require('esbuild');
const Module = require('node:module');
const path = require('node:path');
async function main(){
  let updates=null;const filters=[];
  const before={url:process.env.NEXT_PUBLIC_SUPABASE_URL,key:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY};
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.invalid';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='synthetic';
  global.__locationTest={
    createClient:()=>({auth:{getUser:async token=>({data:{user:token==='valid'?{id:'owner'}:null}})}}),
    getSupabaseAdmin:()=>({from(table){assert.equal(table,'teachers');return {
      select(){return this;},update(value){updates=value;return this;},eq(key,value){filters.push([key,value]);assert.equal(value,key==='user_id'?'owner':'own-teacher');return this;},
      async maybeSingle(){return{data:{id:'own-teacher',location:{}},error:null};},then(resolve){resolve({error:null});},
    };}}),
  };
  try {
    const compiled=await build({entryPoints:['app/api/teacher/location/verify/route.ts'],bundle:true,platform:'node',format:'cjs',write:false,external:['next/server'],plugins:[{name:'boundaries',setup(b){
      b.onResolve({filter:/^(@supabase\/supabase-js|@\/lib\/supabaseAdmin)$/},a=>({path:a.path,namespace:'mock'}));
      b.onLoad({filter:/.*/,namespace:'mock'},a=>{const name=a.path.includes('supabase-js')?'createClient':'getSupabaseAdmin';return{contents:`export const ${name}=globalThis.__locationTest.${name}`};});
    }}]});
    const filename=path.resolve('tests/teachers/location-runtime.cjs');const mod=new Module(filename,module);mod.filename=filename;mod.paths=module.paths;mod._compile(compiled.outputFiles[0].text,filename);
    const request=(timezone,token='valid')=>new Request('https://example.invalid/api/teacher/location/verify',{method:'POST',headers:token?{authorization:`Bearer ${token}`}:{},body:JSON.stringify({teacher_id:'victim',city:'Saint-Georges',region:'QC',country_code:'CA',lat:46,lng:-70,...(timezone!==undefined?{timezone}: {})})});
    assert.equal((await mod.exports.POST(request('America/Toronto',''))).status,401);
    assert.equal((await mod.exports.POST(request('Invalid/Zone'))).status,400);assert.equal(updates,null);
    assert.equal((await mod.exports.POST(request({unsafe:true}))).status,400);assert.equal(updates,null);
    assert.equal((await mod.exports.POST(request('America/Toronto'))).status,200);assert.equal(updates.timezone,'America/Toronto');
    assert.deepEqual(filters.slice(-2),[['user_id','owner'],['id','own-teacher']]);
    assert.equal((await mod.exports.POST(request(undefined))).status,200);assert.ok(!Object.hasOwn(updates,'timezone'));
    console.log('PASS real location handler: timezone validated, owner-only update, omitted timezone preserved; no network or database access');
  } finally {
    delete global.__locationTest;
    for(const [key,value] of [['NEXT_PUBLIC_SUPABASE_URL',before.url],['NEXT_PUBLIC_SUPABASE_ANON_KEY',before.key]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
