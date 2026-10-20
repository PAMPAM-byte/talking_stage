import {notFound} from 'next/navigation';
import {cookies} from 'next/headers';
import DeliveryPreview from '@talkingstage/chat-delivery-preview';
import {Suspense} from 'react';
import {ChatLoading} from '@/components/chat-loading';
export default function Page(props:{searchParams:Promise<{scenario?:string}>}){
 if(process.env.NODE_ENV!=='development'||process.env.TALKINGSTAGE_PREVIEW_TEST!=='1')notFound();
 return <Suspense fallback={<ChatLoading/>}><Preview {...props}/></Suspense>;
}
async function Preview({searchParams}:{searchParams:Promise<{scenario?:string}>}){
 const {scenario}=await searchParams;
 if(scenario==='server-stall')return <StalledRender/>;
 const snapshot=(await cookies()).get('chat-sync-test-snapshot')?.value==='1';
 return <DeliveryPreview scenario={scenario} snapshot={snapshot}/>;
}
async function StalledRender(){
 await new Promise<void>(()=>{});
 return null;
}
