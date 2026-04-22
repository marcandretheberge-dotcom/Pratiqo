import type { User } from "@supabase/supabase-js";

export function authDisplayName(user: User): string {
  const meta = user.user_metadata || {};
  const full = (meta.full_name as string) || (meta.name as string);
  return full || user.email?.split("@")[0] || "Utilisateur";
}

export function authAvatarUrl(user: User): string | null {
  const meta = user.user_metadata || {};
  return (meta.avatar_url as string) || (meta.picture as string) || null;
}
