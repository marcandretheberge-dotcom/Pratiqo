import { buildPublicAudioUrl } from "@/lib/yo/audio/audioUrl";
import { getItalianCourseAudioItem } from "@/lib/yo/audio/italianCourseAudio";
import { platformQuestion } from "@/lib/yo/train/mission";

const recordings = new Map([["ask.mp3", platformQuestion], ["platform.mp3", "Il treno parte dal binario tre."]]);

// Only two existing public recordings. Never forward browser credentials upstream.
export async function GET(request: Request, {params}: {params: Promise<{clip: string}>}) {
  const phrase = recordings.get((await params).clip);
  if (!phrase) return new Response(null, {status: 404});
  const item = getItalianCourseAudioItem(phrase);
  const url = item && buildPublicAudioUrl(item.storagePath);
  if (!url) return new Response(null, {status: 503});
  const range = request.headers.get("range");
  const upstream = await fetch(url, { headers: range ? {Range: range} : {}, redirect: "error", signal: AbortSignal.timeout(10000) });
  if (upstream.status === 416) return new Response(null, {status: 416, headers: {"Content-Range": upstream.headers.get("content-range") ?? "bytes */*"}});
  if (!upstream.ok || !upstream.headers.get("content-type")?.startsWith("audio/")) return new Response(null, {status: 502});
  const headers = new Headers({"Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400", "Accept-Ranges": "bytes"});
  for (const name of ["content-length", "content-range"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, {status: upstream.status, headers});
}
