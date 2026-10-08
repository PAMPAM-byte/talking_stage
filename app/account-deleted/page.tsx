import Link from 'next/link';
import { PublicShell } from '@/components/shells';
export default function Page() { return <PublicShell><div className="onboarding-boundary stack"><h1 className="display page-title">Demo account deleted</h1><p>Your disposable browser-session data has been cleared. No real account or payment records existed.</p><Link href="/onboarding/age" className="button button--primary">Start a new preview</Link></div></PublicShell>; }
