import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function source(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

const bookingModalSrc = source("components/BookingModal.tsx");
const dashboardSrc = source("components/Dashboard.tsx");
const scheduleCardSrc = source("components/dashboard/teacher/TeacherScheduleCard.tsx");
const requestCardSrc = source("components/dashboard/teacher/TeacherRequestCard.tsx");
const studentSearchSrc = source("app/(app)/student/search/page.tsx");

assert.ok(
  bookingModalSrc.includes("border-slate-200 bg-slate-100 text-slate-400") &&
    bookingModalSrc.includes("cursor-not-allowed"),
  "unavailable/past/full date and slot controls must look disabled and grey",
);
assert.ok(
  bookingModalSrc.includes("border-teal-500/45 bg-teal-50 text-teal-900") &&
    bookingModalSrc.includes("hover:border-teal-700 hover:bg-teal-100"),
  "available date and slot controls must look clearly green and clickable",
);
assert.ok(
  bookingModalSrc.includes("border-teal-800 bg-teal-800 text-white"),
  "selected date and slot controls must use a solid dark green selected state",
);

assert.ok(
  dashboardSrc.includes('["pending", "pending_teacher"].includes(b.status)'),
  "teacher request list must be limited to genuine teacher-review states",
);
assert.doesNotMatch(
  dashboardSrc,
  /pendingList[\s\S]{0,350}pending_payment/,
  "pending_payment bookings must not be shown in the reject/refuse request list",
);
assert.doesNotMatch(
  scheduleCardSrc,
  /declineButton|onDecline|TeacherRequestCard/,
  "confirmed teacher schedule cards must not render reject/refuse actions",
);
assert.match(
  requestCardSrc,
  /declineButton/,
  "reject/refuse action should remain isolated to TeacherRequestCard for genuine pending requests",
);

const teacherCardBody = studentSearchSrc.slice(
  studentSearchSrc.indexOf("function TeacherCard"),
  studentSearchSrc.indexOf("function ModeLabel"),
);
assert.match(
  teacherCardBody,
  /publicFirstNameWithInitial\(teacher\.name\)/,
  "mobile teacher result cards must still render the teacher name",
);
assert.match(
  teacherCardBody,
  /mt-1 flex max-w-full gap-1\.5 overflow-x-auto/,
  "teacher badges must sit below the name in a mobile-safe row",
);
assert.ok(
  teacherCardBody.indexOf("publicFirstNameWithInitial(teacher.name)") <
    teacherCardBody.indexOf("badges.map"),
  "teacher name must render before badges so badges cannot cover it",
);

console.log("[bookings] launch QA UI regression tests passed");
