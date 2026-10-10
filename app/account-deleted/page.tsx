import Link from 'next/link';
import { PublicShell } from '@/components/shells';
import { usesSupabase } from '@/lib/backend/config';
export default function Page() { const connected=usesSupabase();return <PublicShell><div className="onboarding-boundary stack"><h1 className="display page-title">{connected?'Account deleted':'Demo account deleted'}</h1><p>{connected?'Your account and its data have been removed from the active service. You are signed out.':'Your disposable browser-session data has been cleared. No real account or payment records existed.'}</p>{connected&&<p className="supporting muted">Existing backups follow the retention information shown before deletion.</p>}<Link href="/" className="button button--primary">Back to TalkingStage</Link></div></PublicShell>; }
