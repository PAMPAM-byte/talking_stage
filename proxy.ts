import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig, usesSupabase } from "@/lib/backend/config";
import { dependencyFetch } from '@/lib/backend/dependency-fetch.mjs';

export async function proxy(request: NextRequest) {
  // Overwrite client-supplied navigation metadata; it controls presentation only.
  request.headers.set("x-talkingstage-path", request.nextUrl.pathname);
  let response = NextResponse.next({ request: { headers: request.headers } });
  if (!usesSupabase()) return response;
  response.headers.set("Cache-Control", "private, no-store");
  const config = supabaseConfig();
  if (!config) return response;
  const client = createServerClient(config.url, config.key, { global: { fetch: dependencyFetch }, cookieOptions: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" }, cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: (values) => {
      values.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      response.headers.set("Cache-Control", "private, no-store");
    },
  } });
  let verified = false;
  try { const { data } = await client.auth.getClaims(); verified = !!data?.claims?.sub; } catch {}
  const privateRoute = ["/discover", "/characters", "/messages", "/settings", "/payments", "/admin"].some(prefix => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`));
  if (privateRoute && !verified) {
    const denied = NextResponse.redirect(new URL("/sign-in", request.url));
    response.cookies.getAll().forEach(cookie => denied.cookies.set(cookie));
    denied.headers.set("Cache-Control", "private, no-store");
    return denied;
  }
  // Identity, onboarding, roles and ownership are independently enforced in DAL/RLS.
  return response;
}
export const config = { matcher: ["/sign-in", "/register", "/onboarding/:path*", "/recover/:path*", "/auth/:path*", "/discover/:path*", "/characters/:path*", "/messages/:path*", "/settings/:path*", "/payments/:path*", "/admin/:path*"] };
