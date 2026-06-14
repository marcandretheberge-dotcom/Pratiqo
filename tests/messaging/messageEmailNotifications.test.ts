import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildNewPratiqoMessageEmail } from "@/lib/email/templates/messages";

process.env.APP_BASE_URL = "https://www.pratiqo.ca";

const root = process.cwd();

function source(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const routeSrc = source("app/api/messages/send/route.ts");
const templateSrc = source("lib/email/templates/messages.ts");

assert.ok(
  routeSrc.includes("sendNewPratiqoMessageEmail"),
  "message send route must call the transactional message email helper",
);

const insertIndex = routeSrc.indexOf(".insert({");
const emailIndex = routeSrc.indexOf("sendNewPratiqoMessageEmail({");
assert.ok(insertIndex >= 0, "message send route must insert a message");
assert.ok(emailIndex > insertIndex, "message email must be sent only after a successful insert");

assert.match(
  routeSrc,
  /if\s*\(\s*receiverId !== user\.id\s*\)/,
  "sender must not receive an email for their own sent message",
);
assert.match(
  routeSrc,
  /if\s*\(\s*recipient\.email\s*\)\s*\{/,
  "message email must only send when a recipient email is available",
);
assert.match(
  routeSrc,
  /catch\s*\(\s*error\s*\)\s*\{\s*console\.warn\("\[messages\/send\] notification email skipped"/,
  "email failures must be logged without blocking message send",
);

const okResponseIndex = routeSrc.indexOf("return NextResponse.json({\n    ok: true");
assert.ok(
  okResponseIndex > emailIndex,
  "message route must still return the normal success response after notification handling",
);

const helperCall = routeSrc.slice(emailIndex, routeSrc.indexOf("});", emailIndex));
assert.doesNotMatch(
  helperCall,
  /\bcontent\b|\bsanitizedContent\b/,
  "message email helper call must not include private message content",
);
assert.doesNotMatch(
  templateSrc,
  /messageBody|bodyText|messageContent|privateContent|opts\.content|opts\.sanitizedContent/,
  "message email template must not accept or render a private message body parameter",
);

const fr = buildNewPratiqoMessageEmail({
  recipientName: "Sofia",
  senderName: "Marc",
  conversationUrl: "https://www.pratiqo.ca/messages?peer=teacher-123",
  locale: "fr",
});
assert.equal(fr.subject, "Nouveau message sur Pratiqo");
assert.equal(fr.ctaUrl, "https://www.pratiqo.ca/messages?peer=teacher-123");
assert.match(fr.html, /Marc/);
assert.match(fr.html, /Ouvrir la conversation/);
assert.doesNotMatch(fr.html, /secret|rendez-vous au caf/i);

const en = buildNewPratiqoMessageEmail({
  recipientName: "Sofia",
  senderName: "",
  locale: "en",
});
assert.equal(en.subject, "New message on Pratiqo");
assert.equal(en.ctaUrl, "https://www.pratiqo.ca/messages");
assert.match(en.html, /A user/);

const packageJson = JSON.parse(source("package.json")) as { scripts?: Record<string, string> };
assert.match(
  packageJson.scripts?.["test:launch-critical"] ?? "",
  /tsx tests\/messaging\/messageEmailNotifications\.test\.ts/,
  "message notification regression test must be wired into test:launch-critical",
);

console.log("[messaging] message email notification tests passed");
