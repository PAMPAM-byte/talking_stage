export const instant = false;
import { AdminScreen } from '@talkingstage/admin-ui';
import { ConnectedAssets } from '@/components/admin/connected-assets';
import { usesSupabase } from '@/lib/backend/config';
import { Suspense } from 'react';
async function Content({ searchParams }: { searchParams: Promise<{ character?: string }> }) { const query = await searchParams; return <ConnectedAssets character={query.character} />; }
export default function Page({ searchParams }: { searchParams: Promise<{ character?: string }> }) { return usesSupabase() ? <Suspense fallback={<p role="status">Loading photos…</p>}><Content searchParams={searchParams} /></Suspense> : <AdminScreen section="assets" />; }
