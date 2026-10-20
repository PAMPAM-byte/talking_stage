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
  let identityUnavailable = false;
  try {
    const { data, error } = await client.auth.getClaims();
    verified = !!data?.claims?.sub;
    identityUnavailable = !!error && error.name !== 'AuthSessionMissingError' && ![400, 401, 403].includes(error.status ?? 0);
  } catch { identityUnavailable = true; }
  const privateRoute = ["/discover", "/characters", "/messages", "/settings", "/payments", "/gifts", "/admin"].some(prefix => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`));
  if (privateRoute && !verified) {
    // An identity-service outage is not evidence that the user signed out.
    // Fail closed without sending an authenticated payment flow back to login.
    if (identityUnavailable) {
      const unavailable = request.method === 'GET'
        ? new NextResponse('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connection interrupted | TalkingStage</title><body style="font-family:system-ui;margin:0;padding:48px 24px;color:#242126"><main style="max-width:520px;margin:12vh auto"><h1>Connection interrupted</h1><p>We could not check your session. Your payment status has not been changed by this check.</p><p>Reload this page to try again. Do not start another payment while an earlier attempt is unconfirmed.</p><form method="get"><button type="submit" style="padding:14px 24px;background:#CF2445;color:white;border:0;border-radius:12px;font:inherit">Try again</button></form></main></body></html>', {status:503,headers:{'Content-Type':'text/html; charset=utf-8'}})
        : NextResponse.json({error:'Session verification is temporarily unavailable. Retry the same payment attempt.'},{status:503});
      unavailable.headers.set('Cache-Control','private, no-store');
      unavailable.headers.set('Retry-After','5');
      response.cookies.getAll().forEach(cookie => unavailable.cookies.set(cookie));
      return unavailable;
    }
    const denied = NextResponse.redirect(new URL("/sign-in", request.url));
    response.cookies.getAll().forEach(cookie => denied.cookies.set(cookie));
    denied.headers.set("Cache-Control", "private, no-store");
    return denied;
  }
  // Identity, onboarding, roles and ownership are independently enforced in DAL/RLS.
  return response;
}
export const config = { matcher: ["/sign-in", "/register", "/onboarding/:path*", "/recover/:path*", "/auth/:path*", "/discover/:path*", "/characters/:path*", "/messages/:path*", "/settings/:path*", "/payments/:path*", "/gifts/:path*", "/admin/:path*", "/api/conversations/:path*", "/api/cast-assets/:path*"] };
