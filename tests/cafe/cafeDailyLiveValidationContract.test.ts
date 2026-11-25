import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8").replace(/\r\n/g, "\n");

const script = read("scripts/validate_cafe_daily_live.ts");
const workflow = read(".github/workflows/cafe-daily-live-validation.yml");
const runbook = read("docs/operations/cafe-daily-live-validation.md");

assert.match(script, /createDailyRoomProvider/);
assert.match(script, /verifyDailyAccountDomainMatch/);
assert.equal((script.match(/provider\.ensureRoom\(roomInput\)/g) ?? []).length, 2);
assert.match(script, /role: "participant"/);
assert.match(script, /role: "host"/);
assert.match(script, /finally \{/);
assert.match(script, /deterministicRoomId\(sessionId\)/);
assert.match(script, /await provider\.deleteRoom\(roomId\)/);
assert.match(script, /temporary room deleted/);
assert.match(script, /cleanup failed/);
assert.match(script, /diagnostic/);
assert.doesNotMatch(script, /console\.(?:log|info|error)\([^\n]*(?:\.token|roomUrl)/i);
assert.doesNotMatch(script, /NEXT_PUBLIC_DAILY|NEXT_PUBLIC_CAFE_DAILY/);

assert.match(workflow, /workflow_dispatch:/);
assert.match(workflow, /pull_request:/);
assert.match(workflow, /environment: cafe-daily-development/);
assert.match(workflow, /DAILY_API_KEY: \$\{\{ secrets\.DAILY_API_KEY \}\}/);
assert.match(workflow, /DAILY_DOMAIN: \$\{\{ secrets\.DAILY_DOMAIN \}\}/);
assert.match(workflow, /CAFE_DAILY_ROOM_HMAC_SECRET/);
assert.match(workflow, /CAFE_DAILY_PARTICIPANT_HMAC_SECRET/);
assert.match(workflow, /github\.event_name == 'workflow_dispatch'/);
assert.doesNotMatch(workflow, /pull_request_target/);
const browserJob = workflow.split("  browser-daily:\n")[1];
assert.ok(browserJob, "real browser job is present");
assert.match(browserJob, /if: github\.event_name == 'workflow_dispatch' && inputs\.browser/);
assert.match(browserJob, /needs: live-daily/);
assert.match(browserJob, /environment: cafe-daily-development/);
assert.match(workflow, /browser:\n(?:[^\n]*\n)*?\s+type: boolean\n\s+default: false/);
assert.match(browserJob, /supabase@3\.1\.0/);
assert.doesNotMatch(browserJob, /\.env|status\.json|next\.log|build\.log|trace\.zip|\.har/);

assert.match(runbook, /URL de salle seule/i);
assert.match(runbook, /iPhone Safari/);
assert.match(runbook, /Android Chrome/);
assert.match(runbook, /éjecte|eject/i);
assert.match(runbook, /CAFE_ROOM_PROVIDER_ENABLED=false/);
assert.match(runbook, /ne doivent contenir.*jeton|Ne pas copier.*jeton/i);

console.log("[cafe:daily-live-contract] manual workflow and secret-handling contract passed");
