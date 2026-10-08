"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useMockAccount } from "./account-provider";
import { Brand } from "./shells";
import { Button, Checkbox, Chip, Notice, SelectField, TextField } from "./ui/primitives";
import { Icon } from "./ui/icon";
import { accountDraft, accountDestination, completeOnboarding, completeRecovery, declareAdult, registerAccount, requestRecovery, safeReturnPath, saveOnboardingPreferences, signInAccount, signOut, simulateAssurance, type AccountScenario } from "@/lib/mock/account";
import type { Gender, Language } from "@/lib/contracts";

export type FlowStep = "age" | "register" | "sign-in" | "recover" | "recovery-complete" | "assurance" | "preferences" | "complete";
const titles: Record<FlowStep, [string, string]> = {
  age: ["A little chemistry starts here.", "TalkingStage is a fictional AI dating experience for adults 18 and over."],
  register: ["Make room for a good conversation.", "Create your account to find a personality you connect with."],
  "sign-in": ["Good to see you again.", "Pick up where your conversation left off."],
  recover: ["Let’s get you back in.", "Enter your email to request an access recovery link."],
  "recovery-complete": ["A fresh start.", "Choose a new password for your account."],
  assurance: ["Before we go further.", "Adult access needs an age-assurance step beyond self-declaration."],
  preferences: ["Let’s make it feel like you.", "A few choices to help you find your kind of conversation."],
  complete: ["Your next conversation awaits.", "One last thing before you explore."],
};
const emailValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export function AccountFlow({ step, expired = false }: { step: FlowStep; expired?: boolean }) {
  const router = useRouter(); const account = useMockAccount();
  const [email, setEmailValue] = useState(accountDraft.email); const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState("");
  const setEmail = (value: string) => { accountDraft.email = value; setEmailValue(value); };
  const [name, setName] = useState(""); const [genders, setGenders] = useState<Gender[]>([]); const [language, setLanguage] = useState<Language>("english");
  const [ageChoice, setAgeChoice] = useState(""); const [consent, setConsent] = useState(false); const [outcome, setOutcome] = useState<"approved" | "failed" | "pending">("approved");
  const [errors, setErrors] = useState<Record<string, string>>({}); const [notice, setNotice] = useState(expired ? "Your session has expired. Sign in to continue." : ""); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false); const [scenario, setScenario] = useState<AccountScenario>("ready");
  useEffect(() => { if (expired) signOut(); }, [expired]);
  useEffect(() => {
    if (!account.ready) return;
    if (step === "register" && account.age !== "adult") router.replace("/onboarding/age");
    if (["assurance", "preferences", "complete"].includes(step)) {
      if (!account.user) router.replace(account.age === "blocked" ? "/onboarding/age" : "/sign-in");
      else if (account.age === "blocked") router.replace("/onboarding/age");
      else if (step !== "assurance" && account.user.adultAccessState !== "approved") router.replace("/onboarding/assurance");
      else if (step === "complete" && !account.user.displayName) router.replace("/onboarding/preferences");
    }
  }, [account.ready, account.age, account.user, step, router]);
  useEffect(() => {
    if (step === "preferences" && account.ready && account.user) {
      const user = account.user;
      queueMicrotask(() => { setName(user.displayName); setGenders(user.preferences.characterGenders); setLanguage(user.preferences.language); });
    }
  }, [account.ready, account.user, step]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(""); const next: Record<string, string> = {};
    if (["register", "sign-in", "recover"].includes(step) && !emailValid(email)) next.email = "Enter a valid email address.";
    if (["register", "recovery-complete"].includes(step) && password.length < 12) next.password = "Use at least 12 characters.";
    if (step === "sign-in" && !password) next.password = "Enter your password.";
    if (step === "recovery-complete" && password !== confirmPassword) next.confirm = "The passwords don’t match.";
    if (step === "register" && !consent) next.consent = "Confirm the AI disclosure and draft terms to continue.";
    if (step === "age" && !ageChoice) next.age = "Choose an age declaration to continue.";
    if (step === "preferences") { if (!name.trim() || name.trim().length > 60) next.name = "Enter a name between 1 and 60 characters."; if (!genders.length) next.genders = "Choose at least one character preference."; }
    if (step === "complete" && !consent) next.consent = "Confirm you understand the fictional AI experience.";
    setErrors(next); if (Object.keys(next).length) return;
    if (step === "age") { declareAdult(ageChoice === "adult"); if (ageChoice === "adult") router.push("/register"); return; }
    if (step === "complete") { if (completeOnboarding()) router.push("/discover"); return; }
    setBusy(true);
    if (step === "register") { const result = await registerAccount(email, scenario); if (result.error) setNotice(result.error.message); else { setPassword(""); router.push("/onboarding/assurance"); } }
    if (step === "sign-in") {
      const result = await signInAccount(email, password, scenario);
      if (result.error) setNotice(result.error.message); else { setPassword(""); const destination = accountDestination(result.data); const returnTo = new URLSearchParams(window.location.search).get("returnTo"); router.push(destination === "/discover" ? safeReturnPath(returnTo) : destination); }
    }
    if (step === "assurance") { const result = await simulateAssurance(outcome, scenario); if (result.error) setNotice(result.error.message); else if (result.data === "approved") router.push("/onboarding/preferences"); }
    if (step === "preferences") { const result = await saveOnboardingPreferences(name, { characterGenders: genders, language }, scenario); if (result.error) setNotice(result.error.message); else router.push("/onboarding/complete"); }
    if (step === "recover") { const result = await requestRecovery(scenario); if (result.error) setNotice(result.error.message); else setDone(true); }
    if (step === "recovery-complete") { const result = await completeRecovery(new URLSearchParams(window.location.search).get("reference"), scenario); if (result.error) setNotice(result.error.message); else { setPassword(""); setConfirmPassword(""); setDone(true); } }
    setBusy(false);
  }
  const blocked = step === "age" && account.age === "blocked";
  const [title, description] = titles[step];
  const back = step === "register" ? "/onboarding/age" : step === "preferences" ? "/onboarding/assurance" : step === "complete" ? "/onboarding/preferences" : "/";
  return <div className="account-page"><header className="container account-header"><Brand /><Link href={step === "sign-in" ? "/onboarding/age" : "/sign-in"} className="button button--quiet">{step === "sign-in" ? "Get started" : "Sign in"}</Link></header><main id="main-content" className="account-main">
    <Link href={back} className="account-back"><Icon name="back" />Back</Link><div className="account-step supporting muted">{["age", "assurance", "preferences", "complete"].includes(step) ? "Getting to know you" : "Your TalkingStage account"}</div>
    <h1 className="display page-title">{blocked ? "TalkingStage is for adults." : title}</h1><p className="muted account-description">{blocked ? "You need to be 18 or older to use this experience. You can’t continue with an under-18 declaration." : description}</p>
    <Notice title="Frontend preview" tone="warning">No real account is created, and no email is sent. Use fictional details and a sample password.</Notice>
    {notice && <div style={{ marginTop: 16 }}><Notice title={notice} tone="danger" live /></div>}
    {blocked ? <div className="stack account-form"><Link href="/" className="button button--secondary">Back to home</Link></div> : done ? <div className="stack account-form"><Notice title={step === "recover" ? "Check your inbox" : "Password reset preview complete"} tone="success" live>{step === "recover" ? "If an account exists for this address, it would receive a recovery link. This preview sends no email." : "No real password was changed. You can review the sign-in flow."}</Notice>{step === "recover" && process.env.NODE_ENV === "development" && <Link href="/recover/complete?reference=demo-valid" className="button button--secondary">Preview recovery link</Link>}<Link href="/sign-in" className="button button--primary">Back to sign in</Link></div> : <form className="stack account-form" noValidate onSubmit={submit}>
      {step === "age" && <><fieldset className="age-options"><legend className="field__label">Confirm your age</legend>{[["adult", "I am 18 or older"], ["underage", "I am under 18"]].map(([value, label]) => <label key={value} className="age-option"><input type="radio" name="age" value={value} checked={ageChoice === value} onChange={() => setAgeChoice(value)} />{label}</label>)}</fieldset>{errors.age && <p className="field__error" role="alert">{errors.age}</p>}<p className="supporting muted">Every character is fictional and clearly adult. This isn’t human-to-human dating.</p></>}
      {["register", "sign-in", "recover"].includes(step) && <TextField label="Email address" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} error={errors.email} />}
      {["register", "sign-in", "recovery-complete"].includes(step) && <TextField label={step === "recovery-complete" ? "New password" : "Password"} type="password" autoComplete={step === "sign-in" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} error={errors.password} hint={step === "sign-in" ? undefined : "Use a sample password with at least 12 characters."} />}
      {step === "recovery-complete" && <><TextField label="Confirm new password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} error={errors.confirm} /><Link href="/recover" className="supporting">Request a new recovery link</Link></>}
      {step === "register" && <><Checkbox label="I understand the characters are fictional AI and agree to the draft terms." checked={consent} onChange={(event) => setConsent(event.target.checked)} />{errors.consent && <p className="field__error" role="alert">{errors.consent}</p>}<p className="supporting muted">Read the <Link href="/terms">terms</Link> and <Link href="/privacy">privacy information</Link>.</p></>}
      {step === "sign-in" && <><Link href="/recover" className="supporting">Forgot your password?</Link>{process.env.NODE_ENV === "development" && <details className="demo-details"><summary>Demo sign-in details</summary><p className="supporting">Email: demo@talkingstage.example<br />Password: TalkingStage123!<br />Use pending@talkingstage.example to review incomplete onboarding.</p></details>}</>}
      {step === "assurance" && <><Notice title="Age-assurance method not selected">The final method and its required screens must be selected before launch. This preview does not verify age or collect identity documents.</Notice>{account.user?.adultAccessState === "assurance_pending" && <Notice title="Verification pending" tone="warning">Pending verification does not grant access.</Notice>}{account.user?.adultAccessState === "failed" && <Notice title="Verification couldn’t be completed" tone="danger">Retry this preview or review the support information.</Notice>}{process.env.NODE_ENV === "development" && <SelectField label="Simulated verification result" value={outcome} onChange={(event) => setOutcome(event.target.value as typeof outcome)}><option value="approved">Approved (demo only)</option><option value="pending">Pending</option><option value="failed">Failed</option></SelectField>}<Link href="/support" className="supporting">View support information</Link></>}
      {step === "preferences" && <><TextField label="Preferred name" value={name} maxLength={60} onChange={(event) => setName(event.target.value)} error={errors.name} hint="This is how characters will address you." /><fieldset className="preference-options"><legend className="field__label">Who would you like to chat with?</legend><div className="row">{([["woman", "Women"], ["man", "Men"]] as [Gender, string][]).map(([value, label]) => <Chip key={value} selected={genders.includes(value)} onClick={() => setGenders((current) => current.includes(value) ? current.filter((gender) => gender !== value) : [...current, value])}>{label}</Chip>)}</div>{errors.genders && <p className="field__error" role="alert">{errors.genders}</p>}</fieldset><SelectField label="Conversation language" value={language} onChange={(event) => setLanguage(event.target.value as Language)}><option value="english">English</option><option value="english_pidgin">English with Pidgin</option></SelectField><p className="supporting muted">You can change these preferences later.</p></>}
      {step === "complete" && <><div className="onboarding-summary"><strong>{account.user?.displayName}</strong><p className="supporting muted">{account.user?.preferences.characterGenders.map((gender) => gender === "woman" ? "Women" : "Men").join(" and ")} · {account.user?.preferences.language === "english_pidgin" ? "English with Pidgin" : "English"}</p></div><Notice title="A fictional connection, on your terms">Characters and photos are AI-generated. Payments are optional support to the operator and never buy affection. You control saved memories and monetary requests.</Notice><Checkbox label="I understand I’m chatting with fictional AI characters." checked={consent} onChange={(event) => setConsent(event.target.checked)} />{errors.consent && <p className="field__error" role="alert">{errors.consent}</p>}</>}
      <Button type="submit" loading={busy} disabled={!account.ready || (step === "assurance" && process.env.NODE_ENV !== "development")}>{step === "register" ? "Create demo account" : step === "sign-in" ? "Sign in to preview" : step === "recover" ? "Send recovery link" : step === "recovery-complete" ? "Reset password" : step === "assurance" ? "Run verification preview" : step === "complete" ? "Explore characters" : "Continue"}<Icon name="arrow" /></Button>
      {process.env.NODE_ENV === "development" && !["age", "complete"].includes(step) && <details className="demo-details"><summary>Preview response controls</summary><SelectField label="Simulated response" value={scenario} disabled={busy} onChange={(event) => setScenario(event.target.value as AccountScenario)}><option value="ready">Ready</option><option value="offline">Offline</option><option value="failure">Service failure</option></SelectField></details>}
    </form>}
    <p className="account-footer supporting muted">18+ · Fictional AI characters · <Link href="/privacy">Your privacy</Link></p>
  </main></div>;
}
