export type TeacherBookingAction = "book" | "request" | "contact" | "waitlist";
export type TeacherBookingCapability = { action: TeacherBookingAction; hasSlot: boolean };

export function deriveTeacherBookingCapability(input: { validRate: boolean; paymentReady: boolean; hasSlot: boolean; canContact: boolean }): TeacherBookingCapability {
  const hasSlot = input.validRate && input.hasSlot;
  return { hasSlot, action: hasSlot ? (input.paymentReady ? "book" : "request") : input.canContact ? "contact" : "waitlist" };
}

export function teacherBookingActionKey(action?: TeacherBookingAction | null) {
  return action === "book" ? "teacherActionBook" : action === "request" ? "teacherActionRequest" :
    action === "contact" ? "teacherActionContact" : action === "waitlist" ? "teacherActionWaitlist" : "teacherActionAvailability";
}
