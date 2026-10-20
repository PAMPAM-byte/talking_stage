import {notFound} from 'next/navigation';
import {cookies} from 'next/headers';
import DeliveryPreview from '@talkingstage/chat-delivery-preview';
import {Suspense} from 'react';
import {ChatLoading} from '@/components/chat-loading';
import {ConversationContinuity} from '@/components/conversation-continuity';
export default function Page(props:{searchParams:Promise<{scenario?:string}>}){
 if(process.env.NODE_ENV!=='development'||process.env.TALKINGSTAGE_PREVIEW_TEST!=='1')notFound();
 return <Suspense fallback={<ChatLoading/>}><Preview {...props}/></Suspense>;
}
async function Preview({searchParams}:{searchParams:Promise<{scenario?:string}>}){
 const {scenario}=await searchParams;
 if(scenario==='server-stall')return <StalledRender/>;
 const jar=await cookies();
 const snapshot=jar.get('chat-sync-test-snapshot')?.value==='1';
 if(scenario==='auth-recovery'){
  const unavailable=jar.get('chat-auth-test-unavailable')?.value==='1';
  return <><span hidden data-test-account={unavailable?'unavailable':'ready'}/><ConversationContinuity unavailable={unavailable}>{!unavailable&&<DeliveryPreview scenario="sync" snapshot={snapshot}/>}</ConversationContinuity></>;
 }
 return <DeliveryPreview scenario={scenario} snapshot={snapshot}/>;
}
async function StalledRender(){
 await new Promise<void>(()=>{});
 return null;
}
