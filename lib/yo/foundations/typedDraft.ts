/** The same bound as the exercise input. Never stores audio or a provider transcript. */
export const TYPED_DRAFT_MAX_LENGTH = 160;

/** A content identity, not a security token; interface locale is not part of it. */
export function exerciseDraftRevision(content: unknown): string {
  const text = JSON.stringify(content);
  let left = 2166136261, right = 5381;
  for (let i = 0; i < text.length; i++) {
    left = Math.imul(left ^ text.charCodeAt(i), 16777619);
    right = Math.imul(right, 33) ^ text.charCodeAt(i);
  }
  return `${(left >>> 0).toString(16)}-${(right >>> 0).toString(16)}`;
}
