import { NextResponse, type NextRequest } from "next/server";
import { backendClient } from "@/lib/backend/server";
import { setFlowCookie } from "@/lib/backend/flow-cookie";

export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const client = await backendClient();
  let destination = "/auth/error";
  if (client && hash && (type === "signup" || type === "recovery")) {
    const { data, error } = await client.auth.verifyOtp({ token_hash: hash, type });
    if (!error && data.user) {
      if (type === "recovery") {
        try { await setFlowCookie("recovery", data.user.id); destination = "/recover/complete"; }
        catch { await client.auth.signOut(); }
      } else destination = "/onboarding/preferences";
    }
  }
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
