export { lessonLocationLabel } from "@/lib/email/location";

export {
  sendWelcomeStudent,
  sendWelcomeTeacher,
  sendCompanionEvolution,
} from "@/lib/email/templates/welcome";

export {
  sendBookingConfirmedStudent,
  sendBookingConfirmedTeacher,
  sendPostClassReviewRequest,
  sendLessonReminderStudent,
  sendLessonReminderTeacher,
} from "@/lib/email/templates/booking";

export { sendProUpgrade } from "@/lib/email/templates/billing";

export {
  sendIdentityVerified,
  sendIdentityFailed,
} from "@/lib/email/templates/identity";

export {
  sendTeacherVerificationRequestToAdmin,
  sendReviewFlaggedAdminAlert,
  sendSupportCaseAdminAlert,
} from "@/lib/email/templates/admin";

export { sendReviewPublishedTeacherEmail } from "@/lib/email/templates/reviews";
