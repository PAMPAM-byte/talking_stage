import { Suspense } from 'react';
import { PaymentDetail } from '@/components/payments';
async function Detail({ params }: { params: Promise<{ paymentIntentId: string }> }) { const { paymentIntentId } = await params; return <PaymentDetail id={paymentIntentId} />; }
export default function Page({ params }: { params: Promise<{ paymentIntentId: string }> }) { return <Suspense fallback={<p role="status">Loading payment…</p>}><Detail params={params} /></Suspense>; }
