import assert from "node:assert/strict";
import { sendLearnerDemandMatchEmail } from "@/lib/email/templates/learnerDemand";

async function main() {
  delete process.env.RESEND_API_KEY;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw Error("No network allowed in notification regression test"); };
  try {
    await assert.rejects(sendLearnerDemandMatchEmail({ email: "fixture@example.test", subject: "Piano",
      city: "Saint-Georges", outcome: "local_match", searchUrl: "/student/search", locale: "fr" }),
    /learner_demand_email_not_sent/);
    console.log("PASS skipped email cannot be recorded as a delivered learner alert");
  } finally { globalThis.fetch = originalFetch; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
