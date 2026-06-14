import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildConversationPreviews, getConversationId, type MessageRow } from "@/lib/messaging";

const root = process.cwd();

function source(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const teacherId = "teacher-1";
const studentId = "student-1";
const conversationId = getConversationId(teacherId, studentId);

const unreadForStudent: MessageRow = {
  id: "m1",
  conversation_id: conversationId,
  sender_id: teacherId,
  receiver_id: studentId,
  content: "Bonjour, voici ma réponse.",
  read: false,
  created_at: "2026-06-14T10:00:00.000Z",
};

const unreadForTeacher: MessageRow = {
  id: "m2",
  conversation_id: conversationId,
  sender_id: studentId,
  receiver_id: teacherId,
  content: "Merci!",
  read: false,
  created_at: "2026-06-14T10:01:00.000Z",
};

const studentPreview = buildConversationPreviews([unreadForStudent, unreadForTeacher], studentId)[0];
const teacherPreview = buildConversationPreviews([unreadForStudent, unreadForTeacher], teacherId)[0];

assert.equal(studentPreview.unreadCount, 1, "student must count unread messages received from teacher");
assert.equal(teacherPreview.unreadCount, 1, "teacher unread count must keep working");

const senderPreview = buildConversationPreviews([unreadForTeacher], studentId)[0];
assert.equal(senderPreview.unreadCount, 0, "sender must not get an unread badge for their own sent message");

const messagingSrc = source("lib/messaging.ts");
assert.match(
  messagingSrc,
  /\.eq\("receiver_id",\s*userId\)\s*[\s\S]*\.eq\("read",\s*false\)/,
  "unread count must use receiver_id + read=false",
);
assert.match(
  messagingSrc,
  /\.update\(\{\s*read:\s*true\s*\}\)\s*[\s\S]*\.eq\("conversation_id",\s*conversationId\)\s*[\s\S]*\.eq\("receiver_id",\s*userId\)/,
  "markAsRead must clear only messages received by the current user",
);
assert.ok(
  messagingSrc.includes("pratiqo:messages-read"),
  "markAsRead must trigger a shell refresh so the badge clears immediately after opening a conversation",
);

const appShellSrc = source("components/AppShell.tsx");
assert.match(
  appShellSrc,
  /<TeacherTopNav unreadMessages=\{unreadMessages\}/,
  "teacher nav must still receive the shared unread count",
);
assert.match(
  appShellSrc,
  /\{\s*href:\s*"\/messages",\s*labelKey:\s*"messages"\s*\}/,
  "student desktop navigation must include Messages",
);
assert.match(
  appShellSrc,
  /\{\s*href:\s*"\/messages",\s*icon:\s*"[^"]+",\s*labelKey:\s*"messages" as const\s*\}/,
  "student mobile bottom navigation must include Messages",
);
assert.match(
  appShellSrc,
  /tab\.href === "\/messages" && unreadMessages > 0[\s\S]*unreadMessages > 99 \? "99\+" : unreadMessages/,
  "student nav must render a badge from the shared unread count",
);
assert.ok(
  appShellSrc.includes('addEventListener("pratiqo:messages-read"') &&
    appShellSrc.includes('removeEventListener("pratiqo:messages-read"'),
  "student and teacher shells must refresh when a conversation is marked read",
);

console.log("[messaging] student unread badge parity tests passed");
