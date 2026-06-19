/** Client-side call to idempotently ensure a teachers row exists for the signed-in teacher. */
export async function fetchEnsureTeacherProfile(accessToken: string): Promise<{
  ok: boolean;
  teacherId?: string;
  created?: boolean;
  error?: string;
}> {
  const res = await fetch("/api/teacher/profile/ensure", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    teacherId?: string;
    created?: boolean;
    error?: string;
  };
  if (!res.ok || !json.ok) {
    return { ok: false, error: "teacher_profile_ensure_failed" };
  }
  return { ok: true, teacherId: json.teacherId, created: json.created };
}
