import { LoadingState } from '@/components/loading-state';
export const instant = false;
import { Suspense } from 'react';
import { Memories } from '@/components/personal-space';
import {usesSupabase} from '@/lib/backend/config';
import {ConnectedMemories} from '@/components/connected-memories';
type Props={params:Promise<{characterId:string}>;searchParams:Promise<{conversation?:string}>};
async function Detail({ params,searchParams }: Props) { const { characterId } = await params; return usesSupabase()?<ConnectedMemories characterId={characterId} conversation={(await searchParams).conversation}/>:<Memories characterId={characterId} />; }
export default function Page(props:Props) { return <Suspense fallback={<LoadingState label="Loading memories…" />}><Detail {...props} /></Suspense>; }
