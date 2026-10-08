export const instant = false;
import { Suspense } from 'react';
import { Memories } from '@/components/personal-space';
import {usesSupabase} from '@/lib/backend/config';
import {ConnectedMemories} from '@/components/connected-memories';
async function Detail({ params }: { params: Promise<{ characterId: string }> }) { const { characterId } = await params; return usesSupabase()?<ConnectedMemories characterId={characterId}/>:<Memories characterId={characterId} />; }
export default function Page({ params }: { params: Promise<{ characterId: string }> }) { return <Suspense fallback={<p role="status">Loading memories…</p>}><Detail params={params} /></Suspense>; }
