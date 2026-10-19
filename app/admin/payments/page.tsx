export const instant = false;
import { AdminScreen } from '@talkingstage/admin-ui';
import {ConnectedPaymentAdmin} from '@/components/connected-payment-admin';
import {usesSupabase} from '@/lib/backend/config';
export default function Page() { return usesSupabase()?<ConnectedPaymentAdmin/>:<AdminScreen section="payments" />; }
