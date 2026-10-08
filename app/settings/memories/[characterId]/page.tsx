import { Suspense } from 'react';
import { Memories } from '@/components/personal-space';
async function Detail({ params }: { params: Promise<{ characterId: string }> }) { const { characterId } = await params; return <Memories characterId={characterId} />; }
export default function Page({ params }: { params: Promise<{ characterId: string }> }) { return <Suspense fallback={<p role="status">Loading memories…</p>}><Detail params={params} /></Suspense>; }
