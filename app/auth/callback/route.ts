import { NextResponse, type NextRequest } from "next/server";
import { backendClient } from "@/lib/backend/server";
import { googleLanding } from "@/lib/backend/google-landing";
import { observe } from "@/lib/monitoring/events.mjs";

// The redirect form of Google sign-in returns here (5 Nov 2026); the on-page Google button
// signs in without leaving the site and uses this only as a fallback.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const client = await backendClient();
  let destination = request.nextUrl.searchParams.has("error") ? "/sign-in?google=cancelled" : "/auth/error";
  if (client && code) {
    const { error } = await observe('auth.sign-in', () => client.auth.exchangeCodeForSession(code));
    if (!error) destination = await googleLanding() ?? destination;
  }
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
