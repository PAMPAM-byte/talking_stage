export const instant = false;
import { AdminScreen } from '@talkingstage/admin-ui';
import { usesSupabase } from '@/lib/backend/config';
import { ConnectedCast } from '@/components/admin/connected-cast';
export default function Page() { return usesSupabase() ? <ConnectedCast create /> : <AdminScreen section="characters" id="new" />; }
