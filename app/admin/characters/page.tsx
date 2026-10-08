export const instant = false;
import { AdminScreen } from '@talkingstage/admin-ui';
import { usesSupabase } from '@/lib/backend/config';
import { ConnectedCast } from '@/components/admin/connected-cast';
export default async function Page({searchParams}:{searchParams:Promise<{page?:string}>}) { return usesSupabase() ? <ConnectedCast page={Number((await searchParams).page??1)}/> : <AdminScreen section="characters" />; }
