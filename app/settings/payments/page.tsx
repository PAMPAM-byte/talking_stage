export const instant = false;
import { PaymentHistory } from '@/components/payments';
import { usesSupabase } from '@/lib/backend/config';
import { Notice } from '@/components/ui/primitives';
import Link from 'next/link';
export default function Page() { return usesSupabase() ? <section className="space-page stack"><Link href="/settings">Back to settings</Link><h1 className="display page-title">Payment history</h1><Notice title="Payments are not available yet">Payment history will appear here when checkout becomes available.</Notice></section> : <PaymentHistory />; }
