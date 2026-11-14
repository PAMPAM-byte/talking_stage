import { Suspense } from 'react';
import { ProtectedArea } from '@/components/protected-area';
import { LoadingState } from '@/components/loading-state';
import { BuyCoins } from '@/components/buy-coins';
import { ConnectedCoins } from '@/components/connected-likes';
import { usesSupabase } from '@/lib/backend/config';
export const instant = false;
export const metadata = { title: 'Buy coins', robots: { index: false, follow: false } };
async function Live({ searchParams }: { searchParams: Promise<{ for?: string; purchase?: string }> }) { const q = await searchParams; return <ConnectedCoins forId={q.for} purchaseId={q.purchase} />; }
export default function Page({ searchParams }: { searchParams: Promise<{ for?: string; purchase?: string }> }) { return <ProtectedArea area="Coins"><Suspense fallback={<LoadingState label="Loading coins…" />}>{usesSupabase() ? <Live searchParams={searchParams} /> : <BuyCoins />}</Suspense></ProtectedArea>; }
