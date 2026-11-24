import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { scenariosAt } from "../../lib/yo/scenarios/catalog";
import { GET } from "../../app/practice/it/bologna/[clip]/route";

test("approved optional scenarios are attached only to their own course destination", () => {
  const [trip] = scenariosAt("it", "u01");
  assert.equal(trip.entry, "/practice/it/bologna/index.html");
  assert.deepEqual(Object.keys(trip.label).sort(), ["en","es","fr"]);
  assert.deepEqual(scenariosAt("it","u02"), []);
  assert.deepEqual(scenariosAt("ja","u01"), []);
  const [hotel] = scenariosAt("es","do.module-2");
  assert.equal(hotel.entry, "/practice/es/hotel/index.html");
  assert.deepEqual(Object.keys(hotel.label).sort(), ["en","es","fr"]);
  assert.deepEqual(scenariosAt("es","do.module-1"), []);
});

test("the two published recordings are public reads; cookies are not relayed",async () => {
  const previousFetch = globalThis.fetch, origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  const calls: string[] = [];
  try {
    globalThis.fetch = async (url, init) => {
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("cookie"),null);
      assert.equal(headers.get("authorization"),null);
      assert.equal(headers.get("range"),"bytes=0-3");
      calls.push(String(url));
      return new Response(new Uint8Array(4), {status:206,headers:{"content-type":"audio/mpeg","content-range":"bytes 0-3/2000"}});
    };
    const call = (clip:string) => GET(new Request("http://localhost/",{headers:{Range:"bytes=0-3",Cookie:"sample=local"}}),{params:Promise.resolve({clip})});
    for(const clip of ["ask.mp3","platform.mp3"]) {
      const res=await call(clip);
      assert.equal(res.status,206);
      assert.equal(res.headers.get("content-range"),"bytes 0-3/2000");
    }
    assert.equal((await call("unregistered.mp3")).status,404);
    assert.equal(calls.length,2);
    assert.match(calls[0],/sentence\/da-quale-binario-parte-il-treno-[\da-f]+\.mp3$/);
    assert.match(calls[1],/sentence\/il-treno-parte-dal-binario-tre-[\da-f]+\.mp3$/);
  } finally {
    globalThis.fetch=previousFetch;
    if(origin===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=origin;
  }
});

test("updating the main offline worker preserves scenario packs",async()=>{
  const deleted:string[]=[];
  let activate: (event:{waitUntil(p:Promise<unknown>):void})=>void = ()=>assert.fail("missing activate");
  runInNewContext(readFileSync("public/sw.js","utf8"),{
    self:{addEventListener:(event:string,fn:typeof activate)=>{if(event==="activate")activate=fn;},clients:{claim() {}}},
    caches:{keys:async()=>["yo-train:test:v1","pratiqo-static-v1","pratiqo-static-v2","unrelated"],delete:async(k:string)=>deleted.push(k)}
  });
  let done:Promise<unknown> | undefined;
  activate({waitUntil:p=>{done=p;}});
  await done;
  assert.deepEqual(deleted,["pratiqo-static-v1"]);
});
