import { LoadingState } from '@/components/loading-state';
export const instant = false;
import { Suspense } from 'react';
import { AdminScreen } from '@talkingstage/admin-ui';
import { usesSupabase } from '@/lib/backend/config';
import { ConnectedCast } from '@/components/admin/connected-cast';
async function Detail({ params }: { params: Promise<{ characterId: string }> }) { const { characterId } = await params; return usesSupabase() ? <ConnectedCast id={characterId} /> : <AdminScreen section="characters" id={characterId} />; }
export default function Page({ params }: { params: Promise<{ characterId: string }> }) { return <Suspense fallback={<LoadingState label="Loading operator record…" />}><Detail params={params} /></Suspense>; }
