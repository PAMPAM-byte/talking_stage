import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { backendClient, currentAccount } from "@/lib/backend/server";
import { validFlowCookie } from "@/lib/backend/flow-cookie";
import { observe } from "@/lib/monitoring/events.mjs";

// Google returns here (5 Nov 2026). New Google accounts still need the 18+ declaration:
// recorded now if they ticked it before choosing Google, otherwise asked on the age screen.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const client = await backendClient();
  let destination = request.nextUrl.searchParams.has("error") ? "/sign-in?google=cancelled" : "/auth/error";
  if (client && code) {
    const { error } = await observe('auth.sign-in', () => client.auth.exchangeCodeForSession(code));
    const account = error ? null : await currentAccount();
    if (account) {
      let declared = !!account.profile.adult_declared_at;
      if (!declared && await validFlowCookie("adult", "18-plus-v1")) {
        const accepted = await account.client.rpc("accept_adult_declaration");
        declared = !accepted.error && accepted.data === true;
        (await cookies()).delete("ts-adult");
      }
      destination = !declared ? "/onboarding/age" : account.profile.onboarding_complete ? "/discover" : "/onboarding/preferences";
    }
  }
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
