export function usesSupabase() {
  return process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_TALKINGSTAGE_MODE === "supabase";
}

export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname))) return null;
    if (key.startsWith("sb_secret_")) return null;
    // Legacy service-role JWTs must never become a public client key.
    if (!key.startsWith("sb_publishable_")) {
      const payload = JSON.parse(atob(key.split(".")[1] ?? ""));
      if (payload.role !== "anon") return null;
    }
    return { url, key };
  } catch { return null; }
}
