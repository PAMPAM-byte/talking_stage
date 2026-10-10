"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { resetOnboardingDraft, submitAccount } from "@/lib/backend/account-actions";
import type { FlowStep } from "./mock-account-flow";
import { Brand } from "./shells";
import { Button, Checkbox, Chip, Notice, SelectField, TextField } from "./ui/primitives";

export type AccountProfile = { display_name: string; genders: string[]; language: string; requests_enabled: boolean; version: number };
const titles: Record<FlowStep, [string, string]> = {
  age: ["A little chemistry starts here.", "TalkingStage is a fictional AI dating experience for adults 18 and over."],
  register: ["Make room for a good conversation.", "Create your account to find a personality you connect with."],
  "sign-in": ["Good to see you again.", "Pick up where your conversation left off."],
  recover: ["Let’s get you back in.", "Enter your email to request an access recovery link."],
  "recovery-complete": ["A fresh start.", "Choose a new password for your account."],
  preferences: ["Let’s make it feel like you.", "A few choices to help you find your kind of conversation."],
  complete: ["Your next conversation awaits.", "One last thing before you explore."],
};
export function RealAccountForm({ step, configured, profile, expired = false, localTestAccount, settings = false }: { step: FlowStep; configured: boolean; settings?: boolean; profile?: AccountProfile; expired?: boolean; localTestAccount?: { email: string; password: string } }) {
  const router = useRouter(); const [busy, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"submit" | "underage" | "leave" | null>(null);
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [adult, setAdult] = useState(false); const [blocked, setBlocked] = useState(false);
  const [genders, setGenders] = useState(profile?.genders ?? []);
  const formRef = useRef<HTMLFormElement>(null);
  const Content = settings ? 'div' : 'main';
  function fillTestAccount() {
    if (busy || !localTestAccount || !formRef.current) return;
    const email = formRef.current.elements.namedItem("email");
    const password = formRef.current.elements.namedItem("password");
    if (email instanceof HTMLInputElement && password instanceof HTMLInputElement) {
      email.value = localTestAccount.email;
      password.value = localTestAccount.password;
      setError(""); setMessage("");
      password.focus();
    }
  }
  function leaveOnboarding() {
    if (busy) return;
    setPendingAction("leave");
    startTransition(async () => {
      try {
        await resetOnboardingDraft();
        // Updates after an await need a new transition so the old screen
        // remains intact until the destination is ready.
        startTransition(() => {
          setError(""); setMessage(""); setAdult(false); setBlocked(false);
          setGenders(profile?.genders ?? []); formRef.current?.reset();
          router.push("/");
        });
      } catch { setError("We couldn’t return to the home page. Please try again."); }
      finally { setPendingAction(null); }
    });
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = new FormData(event.currentTarget); setError(""); setMessage(""); setPendingAction("submit");
    startTransition(async () => {
      try {
        const result = await submitAccount(step, form);
        if (result.destination) { router.push(result.destination); router.refresh(); }
        else { setError(result.error ?? ""); setMessage(result.message ?? ""); if (result.message && step === "preferences") router.refresh(); }
      } catch { setError("We couldn’t connect. Please try again."); }
      finally { setPendingAction(null); }
    });
  }
  function declareUnderage() {
    if (busy) return;
    setError(""); setMessage(""); setPendingAction("underage");
    startTransition(async () => {
      try {
        const result = await submitAccount("underage", new FormData());
        if (result.error) setError(result.error); else setBlocked(true);
      } catch { setError("We couldn’t connect. Please try again."); }
      finally { setPendingAction(null); }
    });
  }
  return <div className={settings ? "space-page stack settings-preferences" : "account-page"}>{!settings && <header className="container account-header"><Brand /><Link className="button button--quiet" href="/support">Help</Link></header>}<Content id={settings ? undefined : 'main-content'} className={settings ? "stack" : "account-main"}>
    {settings ? <Link className="profile-back" href="/settings">Back to settings</Link> : <Link className="account-back" href="/" aria-disabled={busy} onNavigate={event => { event.preventDefault(); leaveOnboarding(); }}>Back to TalkingStage</Link>}<h1 className="display page-title">{settings ? "Preferences" : titles[step][0]}</h1><p className="account-description muted">{settings ? "Choose who you want to meet and how you like to chat." : titles[step][1]}</p>
    {!configured && <Notice title="Account services are unavailable" tone="warning">Please try again later.</Notice>}
    {expired && <Notice title="Sign in to continue">Your session has expired.</Notice>}
    {error && <Notice title={error} tone="danger" live />}{message && <Notice title={message} tone="success" live />}
    {blocked ? <Notice title="TalkingStage is for adults 18 and over" tone="warning">You can return when you are eligible.</Notice> : <form ref={formRef} className="stack account-form" onSubmit={submit}>
      <input type="hidden" name="version" value={profile?.version ?? 0} />
      {step === "sign-in" && localTestAccount && <Notice title="Testing locally"><p>Use the sample account to explore TalkingStage.</p><p className="caption">Email: {localTestAccount.email}<br />Password: {localTestAccount.password}</p><Button variant="secondary" disabled={busy} onClick={fillTestAccount}>Use test account</Button></Notice>}
      {step === "age" && <><Checkbox name="adult" label="I am 18 or older" checked={adult} disabled={busy} onChange={e => setAdult(e.target.checked)} required aria-describedby="adult-hint" /><p id="adult-hint" className="caption muted">This is your declaration, not independent age verification.</p></>}
      {["register", "sign-in", "recover"].includes(step) && <TextField label="Email address" name="email" type="email" autoComplete="email" maxLength={254} required />}
      {["register", "sign-in", "recovery-complete"].includes(step) && <TextField label="Password" name="password" type="password" autoComplete={step === "sign-in" ? "current-password" : "new-password"} minLength={step === "sign-in" ? 1 : 12} maxLength={128} hint={step !== "sign-in" ? "Use at least 12 characters." : undefined} required />}
      {step === "recovery-complete" && <TextField label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />}
      {step === "register" && <><Checkbox name="consent" label="I accept the terms and understand I’ll talk with fictional AI characters." required /><p className="caption"><Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link></p></>}
      {step === "preferences" && <>
        <TextField label="Preferred name" name="displayName" defaultValue={profile?.display_name} maxLength={60} autoComplete="nickname" required />
        {genders.map(gender => <input key={gender} type="hidden" name="genders" value={gender} />)}
        <fieldset className="preference-options"><legend>Who would you like to meet?</legend><div className="row">{[["woman", "Women"], ["man", "Men"]].map(([value, label]) => <Chip key={value} selected={genders.includes(value)} onClick={() => setGenders(current => current.includes(value) ? current.filter(gender => gender !== value) : [...current, value])}>{label}</Chip>)}</div></fieldset>
        <SelectField label="Conversation language" name="language" defaultValue={profile?.language ?? "english"}><option value="english">English</option><option value="english_pidgin">English with Pidgin</option></SelectField>
        <Checkbox label="Allow optional monetary requests" name="requests" defaultChecked={profile?.requests_enabled} /><p className="caption muted">You decide whether to pay. Payments go to the operator, not a real person.</p>
      </>}
      {step === "complete" && <><div className="onboarding-summary"><p>{profile?.display_name}</p><p className="supporting muted">{profile?.genders.map(gender => gender === "woman" ? "Women" : "Men").join(" and ")} · {profile?.language === "english_pidgin" ? "English with Pidgin" : "English"}</p></div><Checkbox name="consent" label="I understand the characters and their photos are AI generated, and relationships are fictional." required /></>}
      <Button type="submit" loading={busy && pendingAction === "submit"} disabled={busy || !configured || (step === "age" && !adult)}>{step === "sign-in" ? "Sign in" : step === "register" ? "Create account" : step === "recover" ? "Send recovery link" : step === "recovery-complete" ? "Save new password" : step === "preferences" ? "Save preferences" : step === "complete" ? "Explore characters" : "Continue"}</Button>
      {step === "age" && <Button variant="quiet" loading={busy && pendingAction === "underage"} disabled={busy} onClick={declareUnderage}>I am under 18</Button>}
      {step === "sign-in" && <Link href="/recover">Forgot your password?</Link>}
    </form>}
    {!settings && <p className="account-footer supporting"><Link href={step === "sign-in" ? "/onboarding/age" : "/sign-in"}>{step === "sign-in" ? "Create an account" : "Already have an account? Sign in"}</Link></p>}
  </Content></div>;
}
