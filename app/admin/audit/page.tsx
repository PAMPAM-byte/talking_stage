export const instant = false;
import { AdminScreen } from '@talkingstage/admin-ui';
import {usesSupabase} from '@/lib/backend/config';
import {ConnectedAudit} from '@/components/admin/connected-operations';
export default async function Page({searchParams}:{searchParams:Promise<{before?:string;outcome?:string}>}) { return usesSupabase()?<ConnectedAudit {...await searchParams}/>:<AdminScreen section="audit" />; }
