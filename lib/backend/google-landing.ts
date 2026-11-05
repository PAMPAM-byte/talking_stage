import "server-only";
import { cookies } from "next/headers";
import { currentAccount } from "./server";
import { validFlowCookie } from "./flow-cookie";

/**
 * Where a person goes once Google has signed them in (5 Nov 2026). New Google accounts still
 * need the 18+ declaration: recorded now if they ticked it before choosing Google, otherwise
 * asked on the age screen. Returns null when no session was created.
 */
export async function googleLanding() {
  const account = await currentAccount();
  if (!account) return null;
  let declared = !!account.profile.adult_declared_at;
  if (!declared && await validFlowCookie("adult", "18-plus-v1")) {
    const accepted = await account.client.rpc("accept_adult_declaration");
    declared = !accepted.error && accepted.data === true;
    (await cookies()).delete("ts-adult");
  }
  return !declared ? "/onboarding/age" : account.profile.onboarding_complete ? "/discover" : "/onboarding/preferences";
}
