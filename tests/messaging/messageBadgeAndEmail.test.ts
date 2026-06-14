import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildConversationPreviews, getConversationId, type MessageRow } from "@/lib/messaging";
import { buildNewPratiqoMessageEmail } from "@/lib/email/templates/messages";

const root = process.cwd();

function source(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const teacherId = "teacher-1";
const studentId = "student-1";
const conversationId = getConversationId(teacherId, studentId);

const rows: MessageRow[] = [
  {
    id: "m1",
    conversation_id: conversationId,
    sender_id: teacherId,
    receiver_id: studentId,
    content: "Bonjour, j'ai repondu a votre question.",
    read: false,
    created_at: "2026-06-13T12:00:00.000Z",
  },
  {
    id: "m2",
    conversation_id: conversationId,
    sender_id: studentId,
    receiver_id: teacherId,
    content: "Merci!",
    read: false,
    created_at: "2026-06-13T12:01:00.000Z",
  },
];

const studentPreview = buildConversationPreviews(rows, studentId)[0];
const teacherPreview = buildConversationPreviews(rows, teacherId)[0];

assert.equal(studentPreview.unreadCount, 1, "student must see unread messages received from teacher");
assert.equal(teacherPreview.unreadCount, 1, "teacher unread badge must keep working");

const sentByStudentOnly = buildConversationPreviews([rows[1]], studentId)[0];
assert.equal(sentByStudentOnly.unreadCount, 0, "sender must not get an unread badge for their own message");

const messagingSrc = source("lib/messaging.ts");
assert.match(
  messagingSrc,
  /\.eq\("receiver_id",\s*userId\)\s*[\s\S]*\.eq\("read",\s*false\)/,
  "fetchUnreadMessageCount must count unread messages for the recipient only",
);
assert.match(
  messagingSrc,
  /\.update\(\{\s*read:\s*true\s*\}\)\s*[\s\S]*\.eq\("conversation_id",\s*conversationId\)\s*[\s\S]*\.eq\("receiver_id",\s*userId\)/,
  "markAsRead must clear only the current recipient's unread messages in the conversation",
);
assert.ok(
  messagingSrc.includes("pratiqo:messages-read"),
  "markAsRead must notify the app shell so badges refresh immediately after opening a conversation",
);

const appShellSrc = source("components/AppShell.tsx");
assert.match(
  appShellSrc,
  /\{\s*href:\s*"\/messages",\s*icon:[\s\S]*labelKey:\s*"messages"/,
  "student mobile bottom navigation must include Messages",
);
assert.match(
  appShellSrc,
  /tab\.href === "\/messages"[\s\S]*unreadMessages > 0/,
  "student desktop Messages tab must render the unread badge",
);
assert.match(
  appShellSrc,
  /tab\.href === "\/messages"[\s\S]*aria-label=\{`\$\{unreadMessages/,
  "student mobile Messages item must render the unread badge",
);
assert.ok(
  appShellSrc.includes("addEventListener(\"pratiqo:messages-read\"") &&
    appShellSrc.includes("removeEventListener(\"pratiqo:messages-read\""),
  "AppShell must refresh unread count when conversations are marked read",
);

const sendRouteSrc = source("app/api/messages/send/route.ts");
assert.ok(
  sendRouteSrc.includes("sendNewPratiqoMessageEmail"),
  "message API must use the existing email infrastructure for recipient notifications",
);
assert.match(
  sendRouteSrc,
  /resolveMessageUserContact\(admin,\s*receiverId\)[\s\S]*sendNewPratiqoMessageEmail/,
  "new-message email must be driven by receiverId, not sent to the sender",
);
assert.doesNotMatch(
  sendRouteSrc,
  /senderEmail[\s\S]*sendNewPratiqoMessageEmail/,
  "message API must not email the sender as the message recipient",
);

process.env.APP_BASE_URL = "https://www.pratiqo.ca";
const email = buildNewPratiqoMessageEmail({
  recipientName: "Sofia",
  senderName: "Marc",
  conversationUrl: "https://www.pratiqo.ca/messages?peer=teacher-1",
  locale: "fr",
});

assert.equal(email.subject, "Nouveau message sur Pratiqo");
assert.equal(email.ctaUrl, "https://www.pratiqo.ca/messages?peer=teacher-1");
assert.match(email.html, /Marc/);
assert.match(email.html, /Ouvrir la conversation/);

console.log("[messaging] unread badge parity and email notification tests passed");
