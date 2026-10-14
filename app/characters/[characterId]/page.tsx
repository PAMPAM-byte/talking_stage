export const instant = false;
import 'server-only';
import { Suspense } from 'react';
import { CharacterProfile } from '@/components/character-profile';
import { ConnectedCharacter } from '@/components/connected-discovery';
import { usesSupabase } from '@/lib/backend/config';
import { discoveryHref, type DiscoveryFilters } from '@/lib/discovery-navigation';
import { Skeleton } from '@/components/ui/primitives';
type ProfileProps = { params: Promise<{ characterId: string }>; searchParams: Promise<DiscoveryFilters> };
async function Profile({ params, searchParams }: ProfileProps) {
  const { characterId } = await params;
  const backHref = discoveryHref(await searchParams);
  return usesSupabase() ? <ConnectedCharacter id={characterId} backHref={backHref}/> : <CharacterProfile id={characterId} backHref={backHref} />;
}
export default function Page(props: ProfileProps) { return <Suspense fallback={<div className="profile-page stack" aria-busy="true"><span className="sr-only" role="status">Loading profile</span><div className="profile-layout" aria-hidden="true"><Skeleton height={420} /><div className="stack"><Skeleton width="70%" height={36} /><Skeleton height={120} /><Skeleton height={180} /></div></div></div>}><Profile {...props} /></Suspense>; }
