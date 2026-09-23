import { assertYoTaskScope, readYoTaskComparison, YO_TASK_SCOPES } from "../tests/yo/yoTaskScope";

const args = process.argv.slice(2);
if (args.length !== 6 || args[0] !== "--task" || args[2] !== "--base" || args[4] !== "--head") {
  throw new Error("Usage: npm run check:yo-task-scope -- --task <intro-deck|flashcards-printables> --base <commit> --head <commit|WORKTREE>");
}
const scope = args[1];
if (scope !== "intro-deck" && scope !== "flashcards-printables") {
  throw new Error(`Unknown task; expected ${Object.keys(YO_TASK_SCOPES).join(", ")}`);
}
const comparison = readYoTaskComparison(args[3], args[5]);
console.log(JSON.stringify({ task: scope, ...comparison }, null, 2));
assertYoTaskScope(scope, comparison.files);
console.log("Task scope PASS");
