export const instant = false;
import { Suspense } from 'react';
import { CharacterProfile } from '@/components/character-profile';
import { ConnectedCharacter } from '@/components/connected-discovery';
import { usesSupabase } from '@/lib/backend/config';
import { discoveryHref, type DiscoveryFilters } from '@/lib/discovery-navigation';
type ProfileProps = { params: Promise<{ characterId: string }>; searchParams: Promise<DiscoveryFilters> };
async function Profile({ params, searchParams }: ProfileProps) {
  const { characterId } = await params;
  const backHref = discoveryHref(await searchParams);
  return usesSupabase() ? <ConnectedCharacter id={characterId} backHref={backHref}/> : <CharacterProfile id={characterId} backHref={backHref} />;
}
export default function Page(props: ProfileProps) { return <Suspense fallback={<p role="status">Loading profile…</p>}><Profile {...props} /></Suspense>; }
