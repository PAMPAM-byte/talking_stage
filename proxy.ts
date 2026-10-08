import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig, usesSupabase } from "@/lib/backend/config";

export async function proxy(request: NextRequest) {
  // Overwrite client-supplied navigation metadata; it controls presentation only.
  request.headers.set("x-talkingstage-path", request.nextUrl.pathname);
  let response = NextResponse.next({ request: { headers: request.headers } });
  if (!usesSupabase()) return response;
  response.headers.set("Cache-Control", "private, no-store");
  const config = supabaseConfig();
  if (!config) return response;
  const client = createServerClient(config.url, config.key, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: (values) => {
      values.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      response.headers.set("Cache-Control", "private, no-store");
    },
  } });
  // Authorization remains in the server data layer and RLS, not this refresh.
  try { await client.auth.getClaims(); } catch { /* Data access still verifies identity and fails closed. */ }
  return response;
}
export const config = { matcher: ["/sign-in", "/register", "/onboarding/:path*", "/recover/:path*", "/auth/:path*", "/discover/:path*", "/characters/:path*", "/messages/:path*", "/settings/:path*", "/payments/:path*", "/admin/:path*"] };
