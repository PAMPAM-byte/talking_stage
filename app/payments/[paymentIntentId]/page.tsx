import { LoadingState } from '@/components/loading-state';
export const instant = false;
import { Suspense } from 'react';
import { PaymentDetail } from '@/components/payments';
import {ConnectedPaymentDetail} from '@/components/connected-payments';
import {usesSupabase} from '@/lib/backend/config';
async function Detail({ params }: { params: Promise<{ paymentIntentId: string }> }) { const { paymentIntentId } = await params; return usesSupabase()?<ConnectedPaymentDetail id={paymentIntentId}/>:<PaymentDetail id={paymentIntentId} />; }
export default function Page({ params }: { params: Promise<{ paymentIntentId: string }> }) { return <Suspense fallback={<LoadingState label="Loading payment…" />}><Detail params={params} /></Suspense>; }
