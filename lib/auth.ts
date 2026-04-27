import { getSupabaseClient } from "./supabase";

export async function loginWithGoogle(redirectPath = "/dashboard", role?: string, referralCode?: string) {
  const supabase = getSupabaseClient();
  const params = new URLSearchParams();
  if (role) params.set("role", role);
  params.set("next", redirectPath);
  if (referralCode) params.set("ref", referralCode);

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?${params.toString()}`
      : undefined;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) {
    console.error("Login failed", error);
    throw error;
  }
}

export async function logout() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Logout failed", error);
    throw error;
  }
}
