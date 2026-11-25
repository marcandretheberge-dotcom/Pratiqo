import {readFileSync} from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
import {isolate} from "./local.mjs";
import {getItalianCourseAudioItem} from "../../lib/yo/audio/italianCourseAudio";
import {platformQuestion} from "../../lib/yo/train/mission";
async function run(){
 const dir=process.env.YO_PASS_RECORDINGS;if(!dir)throw Error("Set YO_PASS_RECORDINGS to the released Bologna pack");
 const env=isolate(),db=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY);
 const bucket="yopratiqo-audio",b=await db.storage.getBucket(bucket);
 if(!b.data){const c=await db.storage.createBucket(bucket,{public:true});if(c.error)throw Error("Could not create local audio fixture bucket");}
 else if(!b.data.public)throw Error("Existing local bucket is private; refusing to change it");
 for(const [name,line] of [["ask.mp3",platformQuestion],["platform.mp3","Il treno parte dal binario tre."]]){
   const key=getItalianCourseAudioItem(line)!.storagePath,bytes=readFileSync(path.join(dir,name));
   const storage=db.storage.from(bucket),exists=await storage.download(key);
   if(!exists.data){const result=await storage.upload(key,bytes,{contentType:"audio/mpeg",upsert:false});if(result.error)throw Error("Local audio fixture not written");}
   const local=await storage.download(key);if(!local.data)throw Error("Local recording missing");
   if(createHash("sha256").update(new Uint8Array(await local.data.arrayBuffer())).digest("hex")!==createHash("sha256").update(bytes).digest("hex"))throw Error("Local fixture differs; not overwriting");
 }
 console.log("Two existing recordings verified in the isolated local bucket; zero generation.");
}
run().catch(e=>{console.error(e.message);process.exitCode=1;});
