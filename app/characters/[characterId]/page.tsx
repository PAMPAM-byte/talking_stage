export const instant = false;
import { Suspense } from 'react';
import { CharacterProfile } from '@/components/character-profile';
import { ConnectedCharacter } from '@/components/connected-discovery';
import { usesSupabase } from '@/lib/backend/config';
async function Profile({ params }: { params: Promise<{ characterId: string }> }) { const { characterId } = await params; return usesSupabase() ? <ConnectedCharacter id={characterId}/> : <CharacterProfile id={characterId} />; }
export default function Page({ params }: { params: Promise<{ characterId: string }> }) { return <Suspense fallback={<p role="status">Loading profile…</p>}><Profile params={params} /></Suspense>; }
