export const instant = false;
import { Messages } from '@/components/messages';
export const metadata = { title: 'Messages', robots: { index: false, follow: false } };
import {usesSupabase} from '@/lib/backend/config';
import {ConnectedConversations} from '@/components/connected-conversations';
export default async function Page({searchParams}:{searchParams:Promise<{archived?:string;page?:string}>}) {const filters=await searchParams;return usesSupabase()?<ConnectedConversations archived={filters.archived==='1'} page={Number(filters.page??1)}/>:<Messages/>;}
