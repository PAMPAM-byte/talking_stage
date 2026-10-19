export const instant = false;
import { PaymentHistory } from '@/components/payments';
import { usesSupabase } from '@/lib/backend/config';
import { ConnectedPaymentHistory } from '@/components/connected-payments';
export default function Page() { return usesSupabase() ? <ConnectedPaymentHistory/> : <PaymentHistory />; }
