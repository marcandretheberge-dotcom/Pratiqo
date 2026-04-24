import { getSupabaseClient } from "./supabase";

export async function loginWithGoogle(redirectPath = "/dashboard") {
  const supabase = getSupabaseClient();
  const path = redirectPath.startsWith("/") ? redirectPath : `/${redirectPath}`;
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}${path}` : undefined;
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
