import { handleSpeechTurn } from "@/lib/yo/speech/server";
export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = handleSpeechTurn;
