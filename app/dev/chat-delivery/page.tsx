import {notFound} from 'next/navigation';
import {cookies} from 'next/headers';
import DeliveryPreview from '@talkingstage/chat-delivery-preview';
import {Suspense} from 'react';
export default function Page(props:{searchParams:Promise<{scenario?:string}>}){
 if(process.env.NODE_ENV!=='development'||process.env.TALKINGSTAGE_PREVIEW_TEST!=='1')notFound();
 return <Suspense fallback={<p role="status">Opening chat preview…</p>}><Preview {...props}/></Suspense>;
}
async function Preview({searchParams}:{searchParams:Promise<{scenario?:string}>}){
 const {scenario}=await searchParams;
 const snapshot=(await cookies()).get('chat-sync-test-snapshot')?.value==='1';
 return <DeliveryPreview scenario={scenario} snapshot={snapshot}/>;
}
