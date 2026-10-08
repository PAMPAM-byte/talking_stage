import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

export async function backendClient() {
  const config = supabaseConfig();
  if (!config) return null;
  const jar = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        // Server Components cannot set cookies. Proxy refreshes them first.
        try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch {}
      },
    },
  });
}

export async function currentAccount() {
  const client = await backendClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  const profile = await client.from("profiles").select("id,display_name,genders,language,requests_enabled,onboarding_complete,adult_declared_at,version").eq("id", data.user.id).single();
  if (profile.error || !profile.data) return null;
  return { client, user: data.user, profile: profile.data };
}
