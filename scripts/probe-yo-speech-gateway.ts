import { probeSpeechGateway } from "./lib/yoSpeechGatewayProbe";

// Runs before Next only when a reviewed preview commit is explicitly opted in.
// No env file loading, credential printing, public endpoint or learner input.
async function main() {
  const result = await probeSpeechGateway(process.env);
  if (result.requested) console.log(`YO_SPEECH_GATEWAY_PREFLIGHT ${JSON.stringify(result)}`);
  if (result.eligiblePreview && !result.passed) process.exitCode = 1;
}

void main().catch(() => {
  // Keep unexpected exceptions out of build logs: a dependency can include headers.
  console.log("YO_SPEECH_GATEWAY_PREFLIGHT {\"unexpectedFailure\":true,\"passed\":false}");
  process.exitCode = 1;
});
