import Link from 'next/link';
import { usesSupabase } from '@/lib/backend/config';
import { currentAccount } from '@/lib/backend/server';
import { NotificationSettings } from '@/components/notification-settings';
export const instant = false;
export const metadata = { title: 'Notifications', robots: { index: false, follow: false } };
async function Connected() {
  const account = await currentAccount(); if (!account) return null;
  const prefs = await account.client.rpc('notification_preferences');
  return <NotificationSettings showNames={prefs.data?.showNames !== false} />;
}
export default function Page() { return usesSupabase() ? <Connected /> : <section className="space-page stack"><Link href="/settings">Back to settings</Link><h1>Notifications</h1><p>Preview mode. Notifications work with a connected account.</p></section>; }
