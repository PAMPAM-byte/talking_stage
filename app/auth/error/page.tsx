import Link from "next/link";
import { PublicShell } from "@/components/shells";
import { Notice } from "@/components/ui/primitives";
export const metadata = { title: "Email link unavailable", robots: { index: false, follow: false } };
export default function Page() { return <PublicShell><div className="account-main stack"><h1 className="display page-title">Let’s try a fresh link.</h1><Notice title="This email link couldn’t be used" tone="warning">It may have expired or already been used. Sign in with your email and password, or request a new recovery link.</Notice><Link className="button button--primary" href="/sign-in">Sign in</Link><Link className="button button--secondary" href="/recover">Request a recovery link</Link></div></PublicShell>; }
