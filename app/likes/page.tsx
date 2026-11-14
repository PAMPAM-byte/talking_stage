import { Suspense } from 'react';
import { ProtectedArea } from '@/components/protected-area';
import { LoadingState } from '@/components/loading-state';
import { Likes } from '@/components/likes';
export const metadata = { title: 'Likes', robots: { index: false, follow: false } };
// Preview only until the likes and coins database is applied; live accounts see "not available yet".
export default function Page() { return <ProtectedArea area="Likes"><Suspense fallback={<LoadingState label="Loading likes…" />}><Likes /></Suspense></ProtectedArea>; }
