import { Suspense } from 'react';
import { ProtectedArea } from '@/components/protected-area';
import { LoadingState } from '@/components/loading-state';
import { BuyCoins } from '@/components/buy-coins';
import { ConnectedCoins } from '@/components/connected-likes';
import { usesSupabase } from '@/lib/backend/config';
export const instant = false;
export const metadata = { title: 'Buy coins', robots: { index: false, follow: false } };
export default function Page() { return <ProtectedArea area="Coins"><Suspense fallback={<LoadingState label="Loading coins…" />}>{usesSupabase() ? <ConnectedCoins /> : <BuyCoins />}</Suspense></ProtectedArea>; }
