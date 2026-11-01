import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { IS_ISOLATED, WEB_ORIGIN } from "./config";

let client: SupabaseClient | null = null;

export function getMobileSupabase(): SupabaseClient | null {
  // The isolated UI test authenticates against local Auth in the WebView only.
  if (IS_ISOLATED || !WEB_ORIGIN) return null;
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) return null;

  client = createClient(url, key, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
  return client;
}
