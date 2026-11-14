import { Suspense } from 'react';
import { ProtectedArea } from '@/components/protected-area';
import { LoadingState } from '@/components/loading-state';
import { BuyCoins } from '@/components/buy-coins';
export const metadata = { title: 'Buy coins', robots: { index: false, follow: false } };
// Preview only until coin payments are connected to Bachs; live accounts see "not available yet".
export default function Page() { return <ProtectedArea area="Coins"><Suspense fallback={<LoadingState label="Loading coins…" />}><BuyCoins /></Suspense></ProtectedArea>; }
