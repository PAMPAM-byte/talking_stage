"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { backendClient, currentAccount } from "./server";
import { setFlowCookie, validFlowCookie } from "./flow-cookie";

export type AccountResult = { error?: string; message?: string; destination?: string };
const unavailable = { error: "Account services are unavailable. Please try again later." };
const confirmationMessage = "Check your email for a confirmation link. If you already have an account, sign in or reset your password.";
function providerFailure(error: { status?: number; name?: string }) {
  if (error.status === 429) return { error: "Too many attempts. Wait a few minutes and try again." };
  if ((error.status ?? 0) >= 500 || error.name === "AuthRetryableFetchError") return unavailable;
  return null;
}
const text = (form: FormData, key: string) => typeof form.get(key) === "string" ? String(form.get(key)) : "";
function origin() {
  const url = new URL(process.env.TALKINGSTAGE_SITE_URL ?? "");
  if (url.pathname !== "/" || (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) throw new Error("Invalid site origin");
  return url.origin;
}
export async function submitAccount(step: string, form: FormData): Promise<AccountResult> {
  try {
    if (step === "underage") {
      try { const client = await backendClient(); if (client) await client.auth.signOut({ scope: "local" }); } catch {}
      await clearLocalCookies();
      return { message: "You need to be 18 or older to continue." };
    }
    if (step === "age") {
      if (form.get("adult") !== "on") return { error: "Confirm that you are 18 or older to continue." };
      await setFlowCookie("adult", "18-plus-v1");
      return { destination: "/register" };
    }
    const client = await backendClient();
    if (!client) return unavailable;
    if (step === "register" || step === "sign-in" || step === "recover") {
      const email = text(form, "email").trim().toLowerCase();
      const password = text(form, "password");
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
      if (step !== "recover" && (password.length < (step === "register" ? 12 : 1) || password.length > 128)) return { error: step === "register" ? "Use a password between 12 and 128 characters." : "Enter your password." };
      if (step === "register") {
        if (!await validFlowCookie("adult", "18-plus-v1")) return { destination: "/onboarding/age" };
        if (form.get("consent") !== "on") return { error: "Accept the terms and AI disclosure to continue." };
        const { data, error } = await client.auth.signUp({ email, password, options: { data: { adult_declaration: "18-plus-v1" }, emailRedirectTo: `${origin()}/auth/confirm` } });
        if (error?.code === "user_already_exists") { (await cookies()).delete("ts-adult"); return { message: confirmationMessage }; }
        if (error) return providerFailure(error) ?? { error: "We couldn’t create your account. Check your details or try again later." };
        (await cookies()).delete("ts-adult");
        if (data.session) return { destination: "/onboarding/preferences" };
        return { message: confirmationMessage };
      }
      if (step === "sign-in") {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) return providerFailure(error) ?? { error: "We couldn’t sign you in. Check your email and password, or confirm your email first." };
        const account = await currentAccount();
        if (!account || !account.profile.adult_declared_at) { await client.auth.signOut(); return { error: "This account needs an accepted adult declaration. Contact support." }; }
        return { destination: account.profile.onboarding_complete ? "/discover" : "/onboarding/preferences" };
      }
      const recovery = await client.auth.resetPasswordForEmail(email, { redirectTo: `${origin()}/auth/confirm` });
      if (recovery.error) return providerFailure(recovery.error) ?? { error: "We couldn’t request a recovery link. Wait a moment and try again." };
      return { message: "If an account matches that email, a recovery link will arrive shortly. Check your inbox and spam folder." };
    }
    const account = await currentAccount();
    if (!account) return { destination: "/sign-in" };
    if (step === "recovery-complete") {
      if (!await validFlowCookie("recovery", account.user.id)) return { error: "This recovery link has expired. Request a new link." };
      const password = text(form, "password");
      if (password.length < 12 || password.length > 128 || password !== text(form, "confirmPassword")) return { error: "Use matching passwords between 12 and 128 characters." };
      const { error } = await client.auth.updateUser({ password });
      if (error) return { error: "Your password wasn’t changed. Try again or request a new link." };
      (await cookies()).delete("ts-recovery");
      await client.auth.signOut();
      return { destination: "/sign-in" };
    }
    if (step === "preferences") {
      const name = text(form, "displayName").trim(); const genders = form.getAll("genders");
      const language = text(form, "language"); const version = Number(text(form, "version"));
      if (!name || name.length > 60 || !genders.length || genders.length > 2 || genders.some(g => !["man", "woman"].includes(String(g))) || !["english", "english_pidgin"].includes(language) || !Number.isSafeInteger(version)) return { error: "Enter a display name, choose who you’d like to meet, and select a language." };
      const { error } = await client.rpc("save_preferences", { p_name: name, p_genders: genders, p_language: language, p_requests: form.get("requests") === "on", p_version: version });
      if (error) return { error: "Your preferences weren’t saved. Refresh the page to get the latest version and try again." };
      return account.profile.onboarding_complete ? { message: "Your preferences are saved." } : { destination: "/onboarding/complete" };
    }
    if (step === "complete") {
      const { error } = await client.rpc("complete_onboarding", { p_version: Number(text(form, "version")), p_consent: form.get("consent") === "on" });
      return error ? { error: "Confirm the AI disclosure and finish your preferences before continuing." } : { destination: "/discover" };
    }
    return { error: "This action is unavailable." };
  } catch { return unavailable; }
}
export async function signOutAccount() {
  const client = await backendClient();
  try { if (client) await client.auth.signOut(); } catch { /* Always clear this browser's local access, including during provider outage. */ }
  await clearLocalCookies();
  redirect("/sign-in");
}
async function clearLocalCookies() {
  const jar = await cookies();
  for (const cookie of jar.getAll()) {
    if (/^sb-.*-auth-token(?:\.\d+)?$/.test(cookie.name)) jar.delete(cookie.name);
  }
  jar.delete("ts-adult"); jar.delete("ts-recovery");
}
