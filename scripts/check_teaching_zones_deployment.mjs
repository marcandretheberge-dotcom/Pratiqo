// Mandatory preflight for this rollout; JSON must come from read-only migration history.
// No database access or mutation. Never use a hand-written history file for deployment.
import fs from "node:fs";
import {plan} from "./prepare_teaching_zones_install.mjs";
if(!process.argv[2])throw new Error('Path to read-only JSON history export required');
const result=plan(JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,'')));
console.log(JSON.stringify({mode:result.mode,standardPushAllowed:result.standardPushAllowed}));
if(!result.standardPushAllowed){console.error('STOP standard deployment: controlled128 schema-only +134 bootstrap required.');process.exitCode=2;}
