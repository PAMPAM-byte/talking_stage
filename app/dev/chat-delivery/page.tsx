import {notFound} from 'next/navigation';
import {cookies} from 'next/headers';
import DeliveryPreview from '@talkingstage/chat-delivery-preview';
export default async function Page({searchParams}:{searchParams:Promise<{scenario?:string}>}){
 if(process.env.NODE_ENV!=='development'||process.env.TALKINGSTAGE_PREVIEW_TEST!=='1')notFound();
 const {scenario}=await searchParams;
 const snapshot=(await cookies()).get('chat-sync-test-snapshot')?.value==='1';
 return <DeliveryPreview scenario={scenario} snapshot={snapshot}/>;
}
