import Link from 'next/link';
import { PublicShell } from '@/components/shells';
import { usesSupabase } from '@/lib/backend/config';
import { erasureDate } from '@/lib/account/erasure-date';
export default async function Page({ searchParams }: { searchParams: Promise<{ until?: string }> }) {
 const connected=usesSupabase();const until=(await searchParams).until;const valid=!!until&&!Number.isNaN(Date.parse(until));
 return <PublicShell><div className="onboarding-boundary stack">
  <h1 className="display page-title">{connected?'Your account is scheduled for deletion':'Demo account deleted'}</h1>
  <p>{connected?<>You’re signed out on every device. Your account will be erased {valid?<>on <strong>{erasureDate(until!)}</strong></>:'in 30 days'}.</>:'Your disposable browser-session data has been cleared. No real account or payment records existed.'}</p>
  {connected&&<p className="supporting muted">Changed your mind? Sign in before then to restore your account and chats.</p>}
  {connected&&<Link href="/sign-in" className="button button--secondary">Sign in to restore</Link>}
  <Link href="/" className="button button--primary">Back to TalkingStage</Link>
 </div></PublicShell>;
}
