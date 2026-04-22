export function handleDbError(
  error: unknown,
  operationType: "create" | "update" | "delete" | "list" | "get" | "write",
  path: string | null = null,
): never {
  const err = error as { code?: string; message?: string; details?: string };
  const msg = err?.message || String(error);
  if (err?.code === "42501" || /permission|RLS|policy/i.test(msg)) {
    throw new Error(
      JSON.stringify({
        error: msg,
        operationType,
        path,
        source: "supabase",
      }),
    );
  }
  throw error instanceof Error ? error : new Error(msg);
}
