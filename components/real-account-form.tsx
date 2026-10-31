"use client";
import Link from "next/link";
import { AccountPage, AccountIntro, AccountPasswordField } from "./account-presentation";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { resendConfirmation, resetOnboardingDraft, submitAccount } from "@/lib/backend/account-actions";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { HumanCheck, humanCheckSiteKey } from "./human-check";
import type { FlowStep } from "./mock-account-flow";
import { Brand } from "./shells";
import { Button, Checkbox, Chip, Notice, SelectField, TextField } from "./ui/primitives";
import { DevelopmentSignInGate } from './development-test-sign-in';

export type AccountProfile = { display_name: string; genders: string[]; language: string; requests_enabled: boolean; version: number };
const titles: Record<FlowStep, [string, string]> = {
  age: ["A little chemistry starts here.", "TalkingStage is a fictional AI dating experience for adults 18 and over."],
  register: ["Create your account.", "Create your account to find a personality you connect with."],
  "sign-in": ["Good to see you again.", "Pick up where your conversation left off."],
  recover: ["Let’s get you back in.", "Enter your email to request an access recovery link."],
  "recovery-complete": ["A fresh start.", "Choose a new password for your account."],
  preferences: ["Let’s make it feel like you.", "A few choices to help you find your kind of conversation."],
  complete: ["Your next conversation awaits.", "One last thing before you explore."],
};
export function RealAccountForm({ step, configured, profile, expired = false, localTestAccount, settings = false, developmentTestLogin = false }: { step: FlowStep; configured: boolean; settings?: boolean; profile?: AccountProfile; expired?: boolean; localTestAccount?: { email: string; password: string }; developmentTestLogin?: boolean }) {
  const router = useRouter(); const [busy, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"submit" | "underage" | "leave" | null>(null);
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [adult, setAdult] = useState(false); const [blocked, setBlocked] = useState(false);
  const [genders, setGenders] = useState(profile?.genders ?? []);
  const formRef = useRef<HTMLFormElement>(null);
  const humanCheck = useRef<TurnstileInstance>(undefined); const [captchaToken, setCaptchaToken] = useState("");
  const checksHuman = !!humanCheckSiteKey && ["register", "sign-in", "recover"].includes(step);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const Content = settings ? 'div' : 'main';
  // Tokens are single-use, so every attempt that stays on this page needs a fresh check.
  function renewHumanCheck() { setCaptchaToken(""); humanCheck.current?.reset(); }
  const humanCheckFailed = () => setError("The security check couldn’t load. Refresh the page and try again.");
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
    const form = new FormData(event.currentTarget); setError(""); setMessage("");
    if (checksHuman && !captchaToken) { setError("Finish the security check, then try again."); return; }
    setPendingAction("submit");
    startTransition(async () => {
      try {
        const result = await submitAccount(step, form);
        if (result.destination) { const destination = result.destination; startTransition(() => router.push(destination)); }
        else {
          setError(result.error ?? ""); setMessage(result.confirmEmail ? "" : result.message ?? ""); if (result.message && step === "preferences") router.refresh();
          if (result.confirmEmail) setConfirmationEmail(String(form.get("email") ?? ""));
          if (checksHuman) renewHumanCheck();
        }
      } catch { setError("We couldn’t connect. Please try again."); if (checksHuman) renewHumanCheck(); }
      finally { setPendingAction(null); }
    });
  }
  function resend() {
    if (busy) return;
    setError(""); setMessage("");
    if (checksHuman && !captchaToken) { setError("Finish the security check, then try again."); return; }
    setPendingAction("submit");
    startTransition(async () => {
      try { const result = await resendConfirmation(confirmationEmail, captchaToken); setError(result.error ?? ""); setMessage(result.message ?? ""); }
      catch { setError("We couldn’t connect. Please try again."); }
      finally { setPendingAction(null); if (checksHuman) renewHumanCheck(); }
    });
  }
  function useDifferentEmail() { setConfirmationEmail(""); setError(""); setMessage(""); }
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
  return <AccountPage step={step} settings={settings} header={!settings && <header className="container account-header"><Brand /><Link className="button button--quiet" href="/support">Help</Link></header>}><Content id={settings ? undefined : 'main-content'} className={settings ? "stack" : "account-main"}>
    {settings ? <Link className="profile-back" href="/settings">Back to settings</Link> : <Link className="account-back" href="/" aria-disabled={busy} onNavigate={event => { event.preventDefault(); leaveOnboarding(); }}>Back to TalkingStage</Link>}<AccountIntro step={settings ? "preferences" : step}/><h1 className="display page-title">{settings ? "Preferences" : titles[step][0]}</h1><p className="account-description muted">{settings ? "Choose who you want to meet and how you like to chat." : titles[step][1]}</p>
    {!configured && <Notice title="Account services are unavailable" tone="warning">Please try again later.</Notice>}
    {expired && <Notice title="Sign in to continue">Your session has expired.</Notice>}
    {error && <Notice title={error} tone="danger" live />}{message && <Notice title={message} tone="success" live />}
    <DevelopmentSignInGate enabled={step === 'sign-in' && developmentTestLogin}>
    {blocked ? <Notice title="TalkingStage is for adults 18 and over" tone="warning">You can return when you are eligible.</Notice> : confirmationEmail ? <div className="stack account-form">
      <Notice title="Check your email" tone="success" live><p>We sent a confirmation link to <strong>{confirmationEmail}</strong>. Open it to finish setting up your account.</p><p>It can take a minute to arrive. Check your spam folder too.</p></Notice>
      {checksHuman && <HumanCheck widgetRef={humanCheck} onToken={setCaptchaToken} onFailure={humanCheckFailed} />}
      <Button variant="secondary" loading={busy && pendingAction === "submit"} disabled={busy} onClick={resend}>Resend confirmation email</Button>
      <Button variant="quiet" disabled={busy} onClick={useDifferentEmail}>Use a different email</Button>
    </div> : <form ref={formRef} className="stack account-form" onSubmit={submit}>
      <input type="hidden" name="version" value={profile?.version ?? 0} />
      {step === "sign-in" && localTestAccount && <Notice title="Testing locally"><p>Use the sample account to explore TalkingStage.</p><p className="caption">Email: {localTestAccount.email}<br />Password: {localTestAccount.password}</p><Button variant="secondary" disabled={busy} onClick={fillTestAccount}>Use test account</Button></Notice>}
      {step === "age" && <><Checkbox name="adult" label="I am 18 or older" checked={adult} disabled={busy} onChange={e => setAdult(e.target.checked)} required aria-describedby="adult-hint" /><p id="adult-hint" className="caption muted">This is your declaration, not independent age verification.</p></>}
      {["register", "sign-in", "recover"].includes(step) && <TextField label="Email address" name="email" type="email" placeholder="you@example.com" autoComplete="email" maxLength={254} required />}
      {["register", "sign-in"].includes(step) && <AccountPasswordField label="Password" name="password" autoComplete={step === "sign-in" ? "current-password" : "new-password"} minLength={step === "sign-in" ? 1 : 12} maxLength={128} placeholder={step === "register" ? "Create a strong password" : "Enter your password"} hint={step === "register" ? "Use at least 12 characters." : undefined} required />}{step === "recovery-complete" && <AccountPasswordField label="Password" name="password" autoComplete="new-password" minLength={12} maxLength={128} hint="Use at least 12 characters." required />}
      {step === "recovery-complete" && <AccountPasswordField label="Confirm password" name="confirmPassword" autoComplete="new-password" minLength={12} maxLength={128} required />}
      {step === "register" && <><Checkbox name="consent" label="I accept the terms and understand I’ll talk with fictional AI characters." required /><p className="caption"><Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link></p></>}
      {step === "preferences" && <>
        <TextField label="Preferred name" name="displayName" defaultValue={profile?.display_name} maxLength={60} autoComplete="nickname" required />
        {genders.map(gender => <input key={gender} type="hidden" name="genders" value={gender} />)}
        <fieldset className="preference-options"><legend>Who would you like to meet?</legend><div className="row">{[["woman", "Women"], ["man", "Men"]].map(([value, label]) => <Chip key={value} selected={genders.includes(value)} onClick={() => setGenders(current => current.includes(value) ? current.filter(gender => gender !== value) : [...current, value])}>{label}</Chip>)}</div></fieldset>
        <SelectField label="Conversation language" name="language" defaultValue={profile?.language ?? "english"}><option value="english">English</option><option value="english_pidgin">English with Pidgin</option></SelectField>
        {/* No opt-in here (founder, 31 Oct): gifts are part of the product. Keep any saved choice unchanged. */}
        {profile?.requests_enabled && <input type="hidden" name="requests" value="on" />}
      </>}
      {step === "complete" && <><div className="onboarding-summary"><p>{profile?.display_name}</p><p className="supporting muted">{profile?.genders.map(gender => gender === "woman" ? "Women" : "Men").join(" and ")} · {profile?.language === "english_pidgin" ? "English with Pidgin" : "English"}</p></div><Checkbox name="consent" label="I understand the characters and their photos are AI generated, and relationships are fictional." required /></>}
      {checksHuman && <HumanCheck widgetRef={humanCheck} onToken={setCaptchaToken} onFailure={humanCheckFailed} />}
      <Button type="submit" loading={busy && pendingAction === "submit"} disabled={busy || !configured || (step === "age" && !adult)}>{step === "sign-in" ? "Sign in" : step === "register" ? "Create account" : step === "recover" ? "Send recovery link" : step === "recovery-complete" ? "Save new password" : step === "preferences" ? "Save preferences" : step === "complete" ? "Explore characters" : "Continue"}</Button>
      {step === "age" && <Button variant="quiet" loading={busy && pendingAction === "underage"} disabled={busy} onClick={declareUnderage}>I am under 18</Button>}
      {step === "sign-in" && <Link href="/recover">Forgot your password?</Link>}
    </form>}
    </DevelopmentSignInGate>
    {!settings && <p className="account-footer supporting"><Link href={step === "sign-in" ? "/onboarding/age" : "/sign-in"}>{step === "sign-in" ? "Create an account" : "Already have an account? Sign in"}</Link></p>}
  </Content></AccountPage>;
}
