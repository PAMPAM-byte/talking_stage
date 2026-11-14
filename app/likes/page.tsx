import { Suspense } from 'react';
import { ProtectedArea } from '@/components/protected-area';
import { LoadingState } from '@/components/loading-state';
import { Likes } from '@/components/likes';
import { ConnectedLikes } from '@/components/connected-likes';
import { usesSupabase } from '@/lib/backend/config';
export const instant = false;
export const metadata = { title: 'Likes', robots: { index: false, follow: false } };
export default function Page() { return <ProtectedArea area="Likes"><Suspense fallback={<LoadingState label="Loading likes…" />}>{usesSupabase() ? <ConnectedLikes /> : <Likes />}</Suspense></ProtectedArea>; }
