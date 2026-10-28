"use client";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useSyncExternalStore, type Ref } from "react";

export const humanCheckSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
// Turnstile's flexible widget needs 300px; the account form is narrower on small phones.
const narrow = "(max-width: 359px)";
const subscribe = (change: () => void) => { const query = matchMedia(narrow); query.addEventListener("change", change); return () => query.removeEventListener("change", change); };

/** Cloudflare Turnstile, shown only when Cloudflare needs an interaction. Posts its token as `captchaToken`. */
export function HumanCheck({ widgetRef, onToken, onFailure }: { widgetRef: Ref<TurnstileInstance | undefined>; onToken: (token: string) => void; onFailure: () => void }) {
  const compact = useSyncExternalStore(subscribe, () => matchMedia(narrow).matches, () => null);
  if (!humanCheckSiteKey || compact === null) return null;
  return <Turnstile ref={widgetRef} siteKey={humanCheckSiteKey} className="human-check"
    options={{ size: compact ? "compact" : "flexible", appearance: "interaction-only", theme: "light", responseFieldName: "captchaToken", refreshExpired: "auto" }}
    onSuccess={onToken} onExpire={() => onToken("")} onError={() => { onToken(""); onFailure(); }} />;
}
