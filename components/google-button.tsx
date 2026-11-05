"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Google Identity Services, loaded only on sign-in screens (5 Nov 2026). Its popup names
// talkingstage.buzz instead of the Supabase project address. Without a client ID, or if the
// script is blocked or slow, the existing redirect button (fallback) is shown instead.
type Gsi = {
  initialize(options: Record<string, unknown>): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
};
declare global { interface Window { google?: { accounts?: { id?: Gsi } } } }
// Trimmed: a value pasted or piped into the host's settings can carry a trailing newline.
const clientId = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "").trim();
const scriptSrc = "https://accounts.google.com/gsi/client";

function loadScript() {
  return new Promise<Gsi>((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google.accounts.id);
    let script = document.querySelector<HTMLScriptElement>(`script[src="${scriptSrc}"]`);
    if (!script) { script = document.createElement("script"); script.src = scriptSrc; script.async = true; document.head.append(script); }
    const timer = setTimeout(() => reject(new Error("timeout")), 8000);
    script.addEventListener("load", () => { clearTimeout(timer); if (window.google?.accounts?.id) resolve(window.google.accounts.id); else reject(new Error("missing")); });
    script.addEventListener("error", () => { clearTimeout(timer); reject(new Error("blocked")); });
  });
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function GoogleButton({ disabled, onCredential, fallback }: { disabled: boolean; onCredential: (credential: string, nonce: string) => void; fallback: ReactNode }) {
  const holder = useRef<HTMLDivElement>(null);
  const handler = useRef(onCredential);
  useEffect(() => { handler.current = onCredential; }, [onCredential]);
  const [state, setState] = useState<"loading" | "ready" | "fallback">(clientId ? "loading" : "fallback");
  useEffect(() => {
    if (!clientId) return;
    let active = true;
    (async () => {
      try {
        const gsi = await loadScript();
        // A fresh nonce per page: Google signs its hash into the token, Supabase checks the original.
        const nonce = crypto.randomUUID();
        gsi.initialize({ client_id: clientId, nonce: await sha256(nonce), ux_mode: "popup", use_fedcm_for_button: true, auto_select: false, callback: (response: { credential?: string }) => { if (response.credential) handler.current(response.credential, nonce); } });
        if (!active || !holder.current) return;
        gsi.renderButton(holder.current, { type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "rectangular", logo_alignment: "center", width: Math.min(400, Math.max(200, holder.current.offsetWidth)) });
        // Google keeps its button hidden when it refuses this site (unregistered address, bad
        // client ID). Switch over only once it is really showing; otherwise keep the fallback.
        const started = Date.now();
        const watch = setInterval(() => {
          const frame = holder.current?.querySelector("iframe");
          const shown = !!frame && frame.getBoundingClientRect().height > 0 && getComputedStyle(frame).display !== "none";
          if (!active || shown || Date.now() - started > 8000) { clearInterval(watch); if (active) setState(shown ? "ready" : "fallback"); }
        }, 250);
      } catch { if (active) setState("fallback"); }
    })();
    return () => { active = false; };
  }, []);
  // Google only draws its button on-screen, so the holder stays in place; it has no height until
  // Google shows the button. The fallback covers that wait, so there is never an empty gap.
  return <>{state !== "fallback" && <div className="google-gsi" aria-hidden={state === "loading" || undefined} data-disabled={disabled || undefined}><div ref={holder} className="google-gsi__button" /></div>}{state !== "ready" && fallback}</>;
}
