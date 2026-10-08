import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AccountFlow as MockAccountFlow, type FlowStep } from "./mock-account-flow";
import { RealAccountForm } from "./real-account-form";
import { supabaseConfig, usesSupabase } from "@/lib/backend/config";
import { currentAccount } from "@/lib/backend/server";

export type { FlowStep } from "./mock-account-flow";
async function ConnectedAccount({ step, expired }: { step: FlowStep; expired?: boolean }) {
  const configured = !!supabaseConfig() && (process.env.AUTH_FLOW_SECRET?.length ?? 0) >= 32 && !!process.env.TALKINGSTAGE_SITE_URL;
  const account = configured && ["preferences", "complete", "recovery-complete"].includes(step) ? await currentAccount() : null;
  if (configured && ["preferences", "complete"].includes(step) && !account) redirect("/sign-in");
  return <RealAccountForm step={step} expired={expired} configured={configured} profile={account?.profile} />;
}
export function AccountFlow(props: { step: FlowStep; expired?: boolean }) {
  if (!usesSupabase()) return <MockAccountFlow {...props} />;
  return <Suspense fallback={<main id="main-content" className="account-main"><p role="status">Opening your account…</p></main>}><ConnectedAccount {...props} /></Suspense>;
}
