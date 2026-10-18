import assert from "node:assert/strict";
import {
  EMPTY_LEARNING_PROJECT,
  parseLearningProject,
  learningProjectSearchHref,
  readLearningProjectDraft,
  learningProjectDraftKey,
} from "../../lib/studentLearningProject";
import {
  mergeDemandGroups,
  classifyDemandGroup,
  type DemandGroup,
} from "../../lib/admin/learningProjectDemand";
import { learningProjectCopy } from "../../lib/studentLearningProjectCopy";

const project = {
  ...EMPTY_LEARNING_PROJECT,
  subject: "Espagnol",
  city: "Saint-Georges, QC",
};
assert.equal(parseLearningProject(null), null);
assert.equal(parseLearningProject({ ...project, subject: " " }), null);
assert.equal(
  parseLearningProject({ ...project, audience: "other-user" }),
  null,
);
assert.equal(parseLearningProject({ ...project, format: "invalid" }), null);
assert.equal(parseLearningProject({ ...project, city: "" }), null);
assert.equal(
  parseLearningProject({ ...project, subject: "x".repeat(121) }),
  null,
);
assert.equal(
  parseLearningProject({
    ...project,
    format: "online",
    city: "private address",
  })?.city,
  "",
);
assert.deepEqual(
  parseLearningProject({ ...project, user_id: "attacker", alertConsent: true }),
  project,
);
const url = new URL(
  learningProjectSearchHref(project)!,
  "https://example.test",
);
assert.equal(url.pathname, "/student/search");
assert.equal(url.searchParams.get("q"), "espagnol");
assert.equal(url.searchParams.get("city"), "Saint-Georges, QC");
assert.equal(url.searchParams.get("format"), "in_person");
assert.equal(
  new URL(
    learningProjectSearchHref({ ...project, format: "online", city: "" })!,
    "https://example.test",
  ).searchParams.has("city"),
  false,
);
assert.equal(
  learningProjectSearchHref({
    ...project,
    subject: "Private unrestricted text",
  }),
  null,
);
assert.equal(
  learningProjectSearchHref({ ...project, city: "Unknown town" }),
  null,
);
assert.equal(readLearningProjectDraft("invalid"), null);
assert.equal(
  readLearningProjectDraft(
    JSON.stringify({
      values: project,
      step: 2,
      savedAt: Date.now() - 86_400_001,
    }),
  ),
  null,
);
assert.equal(
  readLearningProjectDraft(
    JSON.stringify({ values: project, step: 2, savedAt: Date.now() }),
  )?.step,
  2,
);
assert.notEqual(
  learningProjectDraftKey("account-a"),
  learningProjectDraftKey("account-b"),
);

const group: DemandGroup = {
  ...project,
  account_count: 2,
  updated_at: "2026-10-18T12:00:00Z",
};
const merged = mergeDemandGroups([
  group,
  { ...group, subject: "Spanish", account_count: 3 },
]);
assert.equal(merged.length, 1);
assert.equal(merged[0].account_count, 5);
assert.equal(
  mergeDemandGroups([group, { ...group, format: "online" }]).length,
  2,
);
assert.equal(
  mergeDemandGroups([group, { ...group, audience: "child" }]).length,
  2,
);
assert.equal(classifyDemandGroup(group, null).supply, "unavailable");
assert.equal(classifyDemandGroup(group, null).matchingTeachers, null);
assert.equal(classifyDemandGroup(group, []).supply, "none");
assert.equal(
  classifyDemandGroup({ ...group, subject: "Unknown subject" }, []).supply,
  "unclassified",
);
assert.equal(
  classifyDemandGroup({ ...group, city: "Unknown town" }, []).matchingTeachers,
  null,
);
assert.equal(
  classifyDemandGroup({ ...group, format: "online", city: "" }, []).supply,
  "none",
);
for (const locale of ["fr", "en", "es"]) {
  assert.deepEqual(
    Object.keys(learningProjectCopy(locale)).sort(),
    Object.keys(learningProjectCopy("fr")).sort(),
  );
  assert.ok(
    Object.values(learningProjectCopy(locale)).every(
      (value) => value.length > 0,
    ),
  );
}
console.log(
  "PASS learning project: validation, private search links, drafts, demand grouping, unknown supply, FR/EN/ES",
);
