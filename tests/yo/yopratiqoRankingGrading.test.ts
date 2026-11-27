import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";
import { gradeRankingAttempt } from "../../lib/yo/rankings/grade.server";
import { createRankingAttemptClient, createRankingAttemptScope, useRankingAttempt } from "../../lib/yo/rankings/attemptClient";
import { parseRankingAttempt } from "../../lib/yo/rankings/validation";
import type { RankingAnswer, RankingAttempt, RankingAward, RankingLanguage } from "../../lib/yo/rankings/contract";
import type { ItalianActivity } from "../../lib/yo/italian/italianModuleTypes";
import type { CourseUnit } from "../../lib/yo/italian/course/courseTypes";
import { personalizedItalianUnits } from "../../lib/yo/personalized/courseData";
import { germanCourseUnits } from "../../lib/yo/german/courseData";
import { portugueseCourseUnits } from "../../lib/yo/portuguese/courseData";
import { englishCourseUnits } from "../../lib/yo/english/courseData";
import { spanishCourseUnits } from "../../lib/yo/spanish/courseData";
import { frenchQuebecCourseUnits } from "../../lib/yo/frenchQuebec/courseData";
import { japaneseCourseUnits } from "../../lib/yo/japaneseCourse";
import { mandarinUnits } from "../../lib/yo/mandarin/course";

// Authored correct answers are test fixtures only. Production callers capture learner input.
function fixtureAnswer(activity: ItalianActivity): RankingAnswer {
  switch (activity.kind) {
    case "choice": case "listen": case "culture": return activity.correctId;
    case "type": return activity.accepted[0];
    case "order": return activity.answer;
    case "match": return Object.fromEntries(activity.pairs.map(pair => [pair.id, pair.id]));
    case "dialogue": return activity.turns.map(turn => turn.correctId);
    case "cafe": return Object.fromEntries(activity.order.map(order => [order.itemId, String(order.quantity)]));
    case "map": return activity.path;
  }
}
const courses: [RankingLanguage, readonly CourseUnit[]][] = [
  ["it", personalizedItalianUnits], ["de", germanCourseUnits], ["pt-BR", portugueseCourseUnits],
  ["en", englishCourseUnits], ["es", spanishCourseUnits], ["fr-CA", frenchQuebecCourseUnits],
];
type Fixture = RankingAttempt & { kind: string };
const fixtures: Fixture[] = [];
for (const [language, units] of courses) for (const unit of units) for (const lesson of unit.lessons) for (const activity of lesson.activities) {
  fixtures.push({ language, itemId: `course:${unit.id}:${lesson.id}:${activity.id}`, answer: fixtureAnswer(activity), kind: activity.kind });
}
for (const unit of japaneseCourseUnits) {
  for (const activity of unit.activities) {
    const answer = activity.kind === "build" ? activity.answerOrder : activity.kind === "reading" ? activity.accepted[0]
      : activity.kind === "match" ? Object.fromEntries(activity.pairs.map(pair => [pair.id, pair.id])) : activity.answerId;
    fixtures.push({ language: "ja", itemId: `course:${unit.id}:practice:${activity.id}`, answer, kind: activity.kind });
  }
  for (const turn of unit.roleplay.turns) fixtures.push({ language: "ja", itemId: `course:${unit.id}:roleplay:${turn.id}`, answer: turn.answerId, kind: "roleplay" });
}
for (const unit of mandarinUnits) for (const exercise of unit.exercises) {
  const answer = exercise.kind === "match" ? Object.fromEntries(exercise.pairs.map((_, index) => [String(index), String(index)]))
    : exercise.kind === "write" ? exercise.accepted[0] : exercise.answer;
  fixtures.push({ language: "zh", itemId: `course:${unit.id}:practice:${exercise.id}`, answer, kind: exercise.kind });
}

function wrong(answer: RankingAnswer): RankingAnswer {
  if (typeof answer === "string") return "invalid-answer";
  if (Array.isArray(answer)) return [...answer, "invalid-answer"];
  return { ...answer, [Object.keys(answer)[0]]: "invalid-answer" };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

async function grading() {
  // Every currently authored practice ID must resolve; all eight languages use real catalogs.
  for (const fixture of fixtures) {
    const { language,itemId,answer }=fixture;
    assert.deepEqual(parseRankingAttempt({ language,itemId,answer }),{ language,itemId,answer },"every authored answer fits the API contract");
    assert.equal(await gradeRankingAttempt(fixture), true, `${fixture.language} ${fixture.kind} ${fixture.itemId}`);
  }
  const kinds = new Map(fixtures.map(fixture => [`${fixture.language}:${fixture.kind}`, fixture]));
  for (const fixture of kinds.values()) {
    assert.equal(await gradeRankingAttempt({ ...fixture, answer: wrong(fixture.answer) }), false, `wrong ${fixture.language}:${fixture.kind}`);
    for (const answer of [null, true, 10, [], {}, [null], new Array(2), "x".repeat(501), { constructor: "x" }]) {
      assert.equal(await gradeRankingAttempt({ ...fixture, answer } as RankingAttempt), false, `shape ${fixture.language}:${fixture.kind}`);
    }
    if (fixture.kind === "match") {
      const pairs = fixture.answer as Record<string, string>;
      const entries = Object.entries(pairs);
      assert.equal(await gradeRankingAttempt({ ...fixture, answer: Object.fromEntries(entries.slice(1)) }), false, "missing pair");
      assert.equal(await gradeRankingAttempt({ ...fixture, answer: { ...pairs, injected: "injected" } }), false, "extra pair");
      assert.equal(await gradeRankingAttempt({ ...fixture, answer: Object.fromEntries(entries.map(([key]) => [key, entries[0][1]])) }), entries.length === 1, "duplicate targets");
    }
    if (fixture.kind === "dialogue") {
      const answers = fixture.answer as string[];
      assert.equal(await gradeRankingAttempt({ ...fixture, answer: answers.slice(-1) }), answers.length === 1, "last turn alone");
      assert.equal(await gradeRankingAttempt({ ...fixture, answer: ["incorrect-first-turn", ...answers.slice(1)] }), false, "every turn checked");
    }
    if (fixture.kind === "cafe") {
      assert.equal(await gradeRankingAttempt({ ...fixture, answer: { ...fixture.answer as Record<string, string>, unknown: "0" } }), false, "unknown zero-priced basket entry");
      assert.equal(await gradeRankingAttempt({ ...fixture, answer: { [Object.keys(fixture.answer)[0]]: "-1" } }), false);
    }
  }
  for (const [language, units] of courses) {
    const unit = units[0], question = unit.quiz.questions[0];
    assert.equal(await gradeRankingAttempt({ language, itemId: `course:${unit.id}:quiz:${question.id}`, answer: fixtureAnswer(question) }), false, "final/quiz isn't practice XP");
  }
  assert.equal(await gradeRankingAttempt({ ...fixtures[0], language: "fr" as RankingLanguage }), false);
  assert.equal(await gradeRankingAttempt({ ...fixtures[0], itemId: "course:unknown:item" }), false);
  assert.equal(await gradeRankingAttempt({ ...fixtures[0], itemId: "placement:it:one" }), false);
  console.log(`PASS ${fixtures.length} authored practice items, ${kinds.size} language/type combinations and malformed/full-answer guards`);
}

async function delivery() {
  const attempt = fixtures[0];
  const earned: RankingAward = { awarded: 10, totalXp: 20, weekXp: 10 };
  let calls = 0, errors = 0;
  const awards: RankingAward[] = [];
  const client = createRankingAttemptClient({ fetch: async (_input, init) => {
    calls++;
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer token-a");
    assert.deepEqual(JSON.parse(init!.body as string), attempt);
    return Response.json(earned);
  }, award: value => awards.push(value), error: () => { errors++; } });
  assert.equal(await client.submit(attempt), null);
  assert.equal(calls, 0, "anonymous events are dropped, not queued");
  client.setAccount({ owner: "a", token: "token-a" });
  assert.deepEqual(await client.submit(attempt), earned);
  assert.equal(awards.length, 1);
  client.dispose();

  const waiting = deferred<Response>();
  let signal: AbortSignal | undefined;
  const switching = createRankingAttemptClient({ fetch: async (_input, init) => { signal = init?.signal as AbortSignal; return waiting.promise; }, award: value => awards.push(value), error: () => { errors++; } });
  switching.setAccount({ owner: "a", token: "token-a" });
  const inFlight = switching.submit(attempt);
  switching.setAccount({ owner: "b", token: "token-b" });
  assert.equal(signal?.aborted, true);
  waiting.resolve(Response.json(earned));
  assert.equal(await inFlight, null);
  assert.equal(awards.length, 1, "A's late response must not update B's UI");
  assert.equal(errors, 0, "account changes aren't network failures");
  switching.dispose();

  const body = deferred<unknown>(), started = deferred<boolean>();
  const parsing = createRankingAttemptClient({ fetch: async () => ({ ok: true, json: () => { started.resolve(true); return body.promise; } } as Response), award: value => awards.push(value) });
  parsing.setAccount({ owner: "a", token: "token-a" });
  const parsingFlight = parsing.submit(attempt);
  await started.promise;
  parsing.setAccount({ owner: "b", token: "token-b" });
  body.resolve(earned);
  assert.equal(await parsingFlight, null);
  assert.equal(awards.length, 1, "account switch during JSON parsing also suppresses awards");
  parsing.dispose();

  let retries = 0;
  const retry = createRankingAttemptClient({ fetch: async (_input, init) => {
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer token-a");
    if (++retries === 1) throw new Error("temporary connection failure");
    return Response.json(earned);
  }, award: value => awards.push(value), error: () => { errors++; } });
  retry.setAccount({ owner: "a", token: "token-a" });
  assert.deepEqual(await retry.submit(attempt), earned);
  assert.equal(retries, 2);
  assert.equal(awards.length, 2);
  retry.dispose();

  for (const status of [400, 401, 403, 429, 503]) {
    let requests = 0, failures = 0;
    const unavailable = createRankingAttemptClient({ fetch: async () => { requests++; return Response.json({}, { status }); }, award: () => assert.fail("failure cannot award"), error: () => { failures++; } });
    unavailable.setAccount({ owner: "a", token: "token-a" });
    assert.equal(await unavailable.submit(attempt), null);
    assert.equal(requests, status >= 500 ? 2 : 1, `bounded retry ${status}`);
    assert.equal(failures, 1);
    unavailable.dispose();
  }
  const duplicate = createRankingAttemptClient({ fetch: async () => Response.json({ ...earned, awarded: 0 }), award: () => assert.fail("duplicate has no celebration") });
  duplicate.setAccount({ owner: "a", token: "token-a" });
  assert.equal((await duplicate.submit(attempt))?.awarded, 0);
  duplicate.dispose();
  console.log("PASS account-bound in-memory delivery, stale response/JSON guards, retry, failure notice and confirmed-only awards");
}

async function navigationDelivery() {
  const require=createRequire(`${process.cwd()}/package.json`), { JSDOM }=require("jsdom");
  const dom=new JSDOM("<!doctype html><html><body></body></html>",{url:"https://pratiqo.example/"});
  const bindings={window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true};
  const originals=new Map(Object.keys(bindings).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  for(const [key,value] of Object.entries(bindings))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
  const { render,fireEvent,cleanup,act }=require("@testing-library/react") as typeof import("@testing-library/react");
  type Auth=Parameters<typeof createRankingAttemptScope>[0]["getAuth"];
  let authChanged:Parameters<ReturnType<Auth>["onAuthStateChange"]>[0]=()=>{};
  let subscriptions=0,unsubscribed=0,reads=0;
  const accountA={access_token:"token-a",user:{id:"a"}},accountB={access_token:"token-b",user:{id:"b"}};
  const lateInitial=deferred<{data:{session:typeof accountA|null}}>();
  let waiting=deferred<Response>();
  let signal:AbortSignal|undefined;
  const awards:RankingAward[]=[];
  const scope=createRankingAttemptScope({getAuth:()=>({
    onAuthStateChange:callback=>{subscriptions++;authChanged=callback;return{data:{subscription:{unsubscribe:()=>{unsubscribed++;}}}};},
    getSession:()=>{reads++;return lateInitial.promise;},
  }),fetch:async(_input,init)=>{signal=init?.signal as AbortSignal;assert.equal(new Headers(init?.headers).get("authorization"),"Bearer token-a");return waiting.promise;},award:award=>awards.push(award)});
  function Consumer(){const submit=useRankingAttempt(scope);return React.createElement("button",{onClick:()=>submit(fixtures[0])},"Check practice");}
  const earned:RankingAward={awarded:10,totalXp:10,weekXp:10};
  try {
    let view=render(React.createElement(React.StrictMode,null,React.createElement(Consumer),React.createElement(Consumer)));
    assert.equal(subscriptions,1,"multiple consumers and StrictMode keep one auth subscription");assert.equal(reads,1);
    authChanged("SIGNED_IN",accountA);
    await act(async()=>{lateInitial.resolve({data:{session:null}});await Promise.resolve();});
    fireEvent.click(view.getAllByRole("button")[0]);view.unmount();
    assert.equal(signal?.aborted,false,"normal course unmount preserves account-bound delivery");assert.equal(unsubscribed,0);
    await act(async()=>{waiting.resolve(Response.json(earned));await new Promise(resolve=>setTimeout(resolve,0));});
    assert.deepEqual(awards,[earned],"confirmed XP arrives even after next-unit navigation");
    waiting=deferred<Response>();view=render(React.createElement(Consumer));assert.equal(subscriptions,1);
    fireEvent.click(view.getByRole("button"));view.unmount();authChanged("SIGNED_IN",accountB);
    assert.equal(signal?.aborted,true,"auth changes still cancel the original account's pending delivery");
    await act(async()=>{waiting.resolve(Response.json(earned));await new Promise(resolve=>setTimeout(resolve,0));});
    assert.deepEqual(awards,[earned],"A's late response cannot update B after navigation");
    console.log("PASS shared delivery survives consumer unmount, subscribes once, and still cancels account switches");
  } finally {
    scope.dispose();cleanup();dom.window.close();
    assert.equal(unsubscribed,1);
    for(const [key,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}
  }
}

async function main() { await grading(); await delivery(); await navigationDelivery(); }
main().catch(error => { console.error(error); process.exitCode = 1; });
