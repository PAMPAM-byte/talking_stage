import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AccountFlow as MockAccountFlow, type FlowStep } from "./mock-account-flow";
import { RealAccountForm } from "./real-account-form";
import { supabaseConfig, usesSupabase } from "@/lib/backend/config";
import { currentAccount } from "@/lib/backend/server";
import testCredentials from "@/lib/backend/local-test-account.json";

export type { FlowStep } from "./mock-account-flow";
async function ConnectedAccount({ step, expired }: { step: FlowStep; expired?: boolean }) {
  const configured = !!supabaseConfig() && (process.env.AUTH_FLOW_SECRET?.length ?? 0) >= 32 && !!process.env.TALKINGSTAGE_SITE_URL;
  const account = configured && ["preferences", "complete", "recovery-complete"].includes(step) ? await currentAccount() : null;
  if (configured && ["preferences", "complete"].includes(step) && !account) redirect("/sign-in");
  const config = supabaseConfig();
  const localTestAccount = step === "sign-in" && configured && process.env.NODE_ENV === "development"
    && process.env.TALKINGSTAGE_LOCAL_TEST_ACCOUNT === "1" && config
    && ["localhost", "127.0.0.1"].includes(new URL(config.url).hostname)
    ? testCredentials : undefined;
  return <RealAccountForm step={step} expired={expired} configured={configured} profile={account?.profile} localTestAccount={localTestAccount} />;
}
export function AccountFlow(props: { step: FlowStep; expired?: boolean }) {
  if (!usesSupabase()) return <MockAccountFlow {...props} />;
  return <Suspense fallback={<main id="main-content" className="account-main"><p role="status">Opening your account…</p></main>}><ConnectedAccount {...props} /></Suspense>;
}
