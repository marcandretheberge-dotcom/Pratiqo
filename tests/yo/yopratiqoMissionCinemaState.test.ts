import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import {
  filmForMission, finishMissionScene, missionSceneKey, parseMissionCinemaState, queueMissionScene,
  type MissionCinemaScene, type MissionCinemaState,
} from "../../lib/yo/travelCinema";

const start: MissionCinemaScene = { id: "ja:foundations:u01:lesson1:reset0", kind: "mission-start", title: "Une première rencontre" };
const success: MissionCinemaScene = { ...start, kind: "mission-success" };
const artifact: MissionCinemaScene = { ...start, kind: "artifact", title: "Mon premier tampon" };
let state: MissionCinemaState = { seen: [], queue: [] };
state = queueMissionScene(state, start);
assert.equal(queueMissionScene(state, start), state, "repeated renders/inputs cannot queue the same moment twice");
state = queueMissionScene(queueMissionScene(state, success), artifact);
assert.deepEqual(state.queue.map(item => item.kind), ["mission-start", "mission-success", "artifact"]);
assert.equal(finishMissionScene(state, missionSceneKey(success)), state, "a stale or future completion cannot dismiss the visible scene");
state = finishMissionScene(state, missionSceneKey(start));
assert.equal(finishMissionScene(state, missionSceneKey(start)), state, "double skip/end events cannot consume the next film");
assert.equal(queueMissionScene(state, start), state, "a seen film stays optional on lesson resume");
const saved = parseMissionCinemaState(JSON.stringify({ version: 1, seen: state.seen }), JSON.stringify({ version: 1, at: 1000, queue: state.queue }), 2000);
assert.deepEqual(saved, state, "pending success and artifact scenes survive interruption in order");
assert.deepEqual(parseMissionCinemaState("broken", "broken"), { seen: [], queue: [] });
assert.equal(parseMissionCinemaState(null, JSON.stringify({ version: 1, at: 1000, queue: [start] }), 90_000_000).queue.length, 0, "old pending moments do not interrupt a later day's lesson");
assert.equal(parseMissionCinemaState(null, JSON.stringify({ version: 1, at: 9000, queue: [start] }), 1000).queue.length, 0, "future timestamps are invalid");
assert.equal(queueMissionScene(state, { ...start, id: "", kind: "artifact" }), state);
assert.equal(queueMissionScene(state, { ...start, id: "x", title: "" }), state);
const polluted = parseMissionCinemaState(null, JSON.stringify({ version: 1, at: 1000, queue: [{ ...start, kind: "award-credits" }, start, start] }), 2000);
assert.deepEqual(polluted.queue, [start], "malformed kinds and duplicate restored entries are rejected");
for (let i = 0; i < 100; i++) state = queueMissionScene(state, { ...start, id: "burst-" + i });
assert.equal(state.queue.length, 6, "cosmetic queue is bounded");
assert.equal(state.queue[0].kind, "mission-success", "a burst preserves the currently visible moment");
// Hash the independently reviewed, compressed delivery files so a missing or
// substituted clip cannot silently return the production registry to a placeholder.
const reviewedFilms = {
  "mission-start": ["mission-ready", "edd383efeb20eb8d692084b71dcd363d937cfb2c3fbc9958878552e5b20c64b5"],
  "mission-success": ["mission-success", "d22df95099e3f9a6bdee1a984efff41dc6682302873a294ad092366725a85d54"],
  artifact: ["artifact-reveal", "5be4d7cec26f74f652db90d594ee67b9406cf9ef447274b3aff91042512dac57"],
} as const;
for (const kind of ["mission-start", "mission-success", "artifact"] as const) {
  const film = filmForMission(kind);
  const [name, hash] = reviewedFilms[kind];
  assert.ok(existsSync("public" + film.poster), `${kind} needs an actual fallback image`);
  assert.equal(film.src, `/companion/travel/films/${name}.mp4`, `${kind} must use its own completed film`);
  assert.ok(existsSync("public" + film.src), `${kind} must not point to an unrendered film`);
  const bytes = readFileSync("public" + film.src);
  assert.equal(bytes.toString("ascii", 4, 8), "ftyp");
  assert.equal(createHash("sha256").update(bytes).digest("hex"), hash, `${kind} must match the reviewed delivery file`);
}
console.log("PASS: ordered scenes, duplicate guards, interruption restore, stale-data validation, bounded state and actual asset registry");
