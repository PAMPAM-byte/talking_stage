export const instant = false;
import { AdminScreen } from '@talkingstage/admin-ui';
import {usesSupabase} from '@/lib/backend/config';
import {ConnectedOperations} from '@/components/admin/connected-operations';
export default function Page() { return usesSupabase()?<ConnectedOperations/>:<AdminScreen section="operations" />; }
