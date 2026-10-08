export const instant = false;
import { Suspense } from 'react';
import { CharacterProfile } from '@/components/character-profile';
async function Profile({ params }: { params: Promise<{ characterId: string }> }) { const { characterId } = await params; return <CharacterProfile id={characterId} />; }
export default function Page({ params }: { params: Promise<{ characterId: string }> }) { return <Suspense fallback={<p role="status">Loading profile…</p>}><Profile params={params} /></Suspense>; }
