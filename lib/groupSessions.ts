export type GroupSessionRow = {
  id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  discipline: string;
  max_participants: number;
  min_participants: number;
  current_participants: number;
  price_per_person: number | string;
  date: string;
  time: string;
  duration_minutes: number;
  location: string | null;
  online_link: string | null;
  teaching_mode: string;
  is_recurring: boolean | null;
  recurrence: string | null;
  status: string;
  created_at?: string;
};

export type GroupRegistrationRow = {
  id: string;
  session_id: string;
  student_id: string;
  status: string;
  stripe_payment_intent_id: string | null;
  price_paid: number | string;
  created_at?: string;
};

export const GROUP_SESSION_STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  full: "Complet",
  cancelled: "Annulé",
};

export function spotsRemaining(session: Pick<GroupSessionRow, "max_participants" | "current_participants">): number {
  return Math.max(0, Number(session.max_participants) - Number(session.current_participants));
}

export function isSessionBookable(session: GroupSessionRow): boolean {
  return session.status === "open" && spotsRemaining(session) > 0;
}

export function planAllowsGroupSessions(plan: string | null | undefined): boolean {
  const p = (plan || "free").toLowerCase();
  return p === "pro" || p === "enterprise";
}
