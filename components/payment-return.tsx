"use client";
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {checkGiftAction} from '@/lib/backend/payment-actions';
import {Button,Notice} from './ui/primitives';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
type Phase='checking'|'paid'|'waiting'|'unpaid'|'error'|'done';
// Bachs returns here after checkout. Confirm with Bachs directly instead of waiting for the webhook.
export function PaymentReturn({conversation,name}:{conversation:string;name:string}){
 const params=useSearchParams();const router=useRouter();const pathname=usePathname();
 const [intent]=useState(()=>{const value=params.get('payment');return value&&uuid.test(value)?value:null;});
 const [phase,setPhase]=useState<Phase>('checking');const [round,setRound]=useState(0);const active=useRef(true);
 useEffect(()=>{if(intent)router.replace(pathname,{scroll:false});},[intent,pathname,router]);
 useEffect(()=>{
  if(!intent)return;active.current=true;
  (async()=>{
   setPhase('checking');
   for(let attempt=0;attempt<6&&active.current;attempt++){
    if(attempt)await new Promise(resolve=>setTimeout(resolve,3000));
    try{
     const data=new FormData();data.set('id',intent);const result=await checkGiftAction(data);
     if(!active.current)return;
     if(result.status==='paid'){setPhase('paid');router.refresh();return;}
     if(result.status&&['failed','cancelled','expired'].includes(result.status)){setPhase('unpaid');router.refresh();return;}
     if(result.error&&attempt===5){setPhase('error');return;}
    }catch{if(attempt===5){setPhase('error');return;}}
   }
   if(active.current)setPhase('waiting');
  })();
  return ()=>{active.current=false;};
 },[intent,round,router]);
 useEffect(()=>{if(phase!=='paid')return;const timer=setTimeout(()=>setPhase('done'),8000);return ()=>clearTimeout(timer);},[phase]);
 if(!intent||phase==='done')return null;
 return <div className="payment-return">
  {phase==='checking'&&<div className="payment-return__checking" role="status"><span className="spinner" aria-hidden="true" />Confirming your payment with Bachs…</div>}
  {phase==='paid'&&<Notice title="Payment received" tone="success" live>Your receipt is in the chat below, and {name} has seen it.</Notice>}
  {phase==='waiting'&&<Notice title="Payment not confirmed yet" tone="warning" live><p>Bank transfers can take a few minutes. Your receipt will appear in this chat once Bachs confirms it.</p><Button variant="secondary" onClick={()=>setRound(value=>value+1)}>Check again</Button></Notice>}
  {phase==='unpaid'&&<Notice title="Payment not completed" tone="warning" live><p>No money was taken for this attempt.</p><Link className="button button--secondary" href={`/gifts/${conversation}`}>Try again</Link></Notice>}
  {phase==='error'&&<Notice title="Couldn’t check this payment" tone="warning" live><p>Your payment status is unchanged. Check again in a moment.</p><Button variant="secondary" onClick={()=>setRound(value=>value+1)}>Check again</Button></Notice>}
 </div>;
}
