"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMockAccount } from "./account-provider";
import { accountDestination, signOut } from "@/lib/mock/account";
import { PublicShell } from "./shells";
import { Button, Card, Notice, Skeleton } from "./ui/primitives";
export function OnboardingPreview() {
  const account = useMockAccount(); const router = useRouter();
  const eligible = account.user?.adultAccessState === "approved" && account.user.onboardingStep === "complete" && account.consent && account.age === "adult";
  useEffect(() => { if (account.ready && !eligible) router.replace(account.age === "blocked" ? "/onboarding/age" : accountDestination(account.user)); }, [account.ready, eligible, account.age, account.user, router]);
  return <PublicShell actions={eligible ? <Button variant="quiet" onClick={() => { signOut(); router.replace("/sign-in"); }}>Sign out</Button> : undefined}><div className="onboarding-boundary stack">{!account.ready || !eligible ? <><span className="sr-only" role="status">Checking demo onboarding</span><Skeleton width="60%" height={32} /></> : <><h1 className="display page-title">You’re all set, {account.user?.displayName}.</h1><p className="muted">Your demo onboarding is complete.</p><Card><Notice title="Discovery is next">The character discovery screen is scheduled for Stage 3. This page marks the end of the current onboarding preview.</Notice></Card><div className="row"><Link href="/onboarding/preferences" className="button button--secondary">Review preferences</Link><Link href="/" className="button button--quiet">Back to home</Link></div><p className="supporting muted">This is a frontend demo. No real account or age verification has been created.</p></>}</div></PublicShell>;
}
