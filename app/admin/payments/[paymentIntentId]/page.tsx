import { LoadingState } from '@/components/loading-state';
export const instant = false;
import { Suspense } from 'react';
import { AdminScreen } from '@talkingstage/admin-ui';
import {ConnectedPaymentAdmin} from '@/components/connected-payment-admin';
import {usesSupabase} from '@/lib/backend/config';
async function Detail({ params }: { params: Promise<{ paymentIntentId: string }> }) { const { paymentIntentId } = await params; return usesSupabase()?<ConnectedPaymentAdmin id={paymentIntentId}/>:<AdminScreen section="payments" id={paymentIntentId} />; }
export default function Page({ params }: { params: Promise<{ paymentIntentId: string }> }) { return <Suspense fallback={<LoadingState label="Loading operator record…" />}><Detail params={params} /></Suspense>; }
