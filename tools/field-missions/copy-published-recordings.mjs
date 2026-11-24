// Maintainer-only: mirror existing public course recordings. Never run during a build.
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {createHash} from "node:crypto";
const req=createRequire(import.meta.url),{fieldMissions}=req("../../lib/yo/scenarios/fieldMissions.ts"),{sourceRecordings}=req("./sources.ts");
const dir=fileURLToPath(new URL(".",import.meta.url)),base=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
if(base.protocol!=="https:"||!base.hostname.endsWith(".supabase.co")||base.username||base.password||base.search||base.hash||base.pathname!=="/")throw Error("Expected the public course-storage origin");
const records=[];
for(const m of fieldMissions){
  for(const {id,storagePath} of sourceRecordings(m)){
    try{await fs.access(path.resolve(dir,"../../public/audio",storagePath));continue;}catch{/* not bundled */}
    const url=new URL("/storage/v1/object/public/yopratiqo-audio/"+storagePath,base);
    const res=await fetch(url,{redirect:"error",signal:AbortSignal.timeout(20000)});
    if(!res.ok||!res.headers.get("content-type")?.startsWith("audio/"))throw Error(m.id+" "+id+": "+res.status+" not playable audio");
    const bytes=Buffer.from(await res.arrayBuffer());
    if(bytes.length<500||bytes.length>2000000)throw Error("Unexpected size for "+id);
    const target=path.join(dir,"recordings",m.id);await fs.mkdir(target,{recursive:true});
    const filename=path.join(target,id+".mp3");
    try{await fs.writeFile(filename,bytes,{flag:"wx"});}catch(e){
      if(e.code!=="EEXIST"||!(await fs.readFile(filename)).equals(bytes))throw e;
    }
    records.push({mission:m.id,id,storagePath,sha256:createHash("sha256").update(bytes).digest("hex")});
  }
}
await fs.writeFile(path.join(dir,"recordings","sources.json"),JSON.stringify(records,null,2)+"\n");
console.log(records.length,"published recordings copied or verified; no generation.");
