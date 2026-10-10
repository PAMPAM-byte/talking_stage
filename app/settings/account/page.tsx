export const instant = false;
import { AccountDeletion } from '@/components/personal-space';
import { usesSupabase } from '@/lib/backend/config';
import { Notice } from '@/components/ui/primitives';
import Link from 'next/link';
export default function Page() { return usesSupabase() ? <section className="space-page stack"><Link href="/settings">Back to settings</Link><h1 className="display page-title">Account and data</h1><Notice title="Account deletion is not available yet">Contact <Link href="/support">support</Link> for help with your account.</Notice></section> : <AccountDeletion />; }
