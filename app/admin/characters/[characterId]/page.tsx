export const instant = false;
import { Suspense } from 'react';
import { AdminScreen } from '@talkingstage/admin-ui';
async function Detail({ params }: { params: Promise<{ characterId: string }> }) { const { characterId } = await params; return <AdminScreen section="characters" id={characterId} />; }
export default function Page({ params }: { params: Promise<{ characterId: string }> }) { return <Suspense fallback={<p role="status">Loading operator record…</p>}><Detail params={params} /></Suspense>; }
