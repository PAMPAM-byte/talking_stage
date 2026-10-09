export const instant = false;
import { RequestSettings } from '@/components/personal-space';
import {ConnectedRequests} from '@/components/connected-requests';
import {usesSupabase} from '@/lib/backend/config';
export default async function Page({searchParams}:{searchParams:Promise<{page?:string}>}) { const query=await searchParams;return usesSupabase()?<ConnectedRequests page={/^\d+$/.test(query.page??'')?Number(query.page):1}/>:<RequestSettings />; }
