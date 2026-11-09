export const instant = false;
import {usesSupabase} from '@/lib/backend/config';
import {ConnectedPeople} from '@/components/admin/connected-people';
import {EmptyState} from '@/components/ui/primitives';
// Live accounts only: the development preview has no real people to list.
export default async function Page({searchParams}:{searchParams:Promise<{q?:string;filter?:string;page?:string}>}) { return usesSupabase()?<ConnectedPeople {...await searchParams}/>:<EmptyState title="Not available in preview" icon="people">People works with live accounts only.</EmptyState>; }
