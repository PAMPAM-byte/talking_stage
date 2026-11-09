export const instant = false;
import {usesSupabase} from '@/lib/backend/config';
import {ConnectedPeople} from '@/components/admin/connected-people';
import {EmptyState} from '@/components/ui/primitives';
// Live accounts only: the development preview has no real people to look up.
export default async function Page({searchParams}:{searchParams:Promise<{q?:string}>}) { return usesSupabase()?<ConnectedPeople q={(await searchParams).q}/>:<EmptyState title="Not available in preview" icon="people">Look up a person works with live accounts only.</EmptyState>; }
