import assert from "node:assert/strict";
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
for (const kind of ["mission-start", "mission-success", "artifact"] as const) {
  const film = filmForMission(kind);
  assert.ok(existsSync("public" + film.poster), `${kind} needs an actual fallback image`);
  if (film.src) {
    assert.ok(existsSync("public" + film.src), `${kind} must not point to an unrendered film`);
    assert.equal(readFileSync("public" + film.src).toString("ascii", 4, 8), "ftyp");
    assert.ok(!film.src.includes("taxi"), "a generic mission must not mislabel the approved taxi trip");
  }
}
console.log("PASS: ordered scenes, duplicate guards, interruption restore, stale-data validation, bounded state and actual asset registry");
