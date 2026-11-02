"use client";
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {checkGiftAction} from '@/lib/backend/payment-actions';
import {Button,Notice} from './ui/primitives';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
type Phase='checking'|'paid'|'waiting'|'unpaid'|'error'|'done';
const wait=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function check(id:string){const data=new FormData();data.set('id',id);return checkGiftAction(data);}
// Bachs returns here after checkout: confirm with Bachs directly instead of waiting for the webhook.
// Every chat load also rechecks recent unconfirmed payments quietly, so a missed check or webhook recovers.
export function PaymentReturn({conversation,name,unsettled=[]}:{conversation:string;name:string;unsettled?:string[]}){
 const params=useSearchParams();const router=useRouter();const pathname=usePathname();
 const [intent]=useState(()=>{const value=params.get('payment');return value&&uuid.test(value)?value:null;});
 const [backlog]=useState(()=>unsettled.filter(id=>uuid.test(id)&&id!==params.get('payment')));
 const [phase,setPhase]=useState<Phase>(intent?'checking':'done');const [round,setRound]=useState(0);const active=useRef(true);
 useEffect(()=>{if(intent)router.replace(pathname,{scroll:false});},[intent,pathname,router]);
 useEffect(()=>{
  if(!intent)return;active.current=true;
  (async()=>{
   if(round===0)setPhase('checking');
   // The first round retries while Bachs settles; later rounds are single checks.
   const attempts=round===0?6:1;
   for(let attempt=0;attempt<attempts&&active.current;attempt++){
    if(attempt)await wait(3000);
    try{
     const result=await check(intent);
     if(!active.current)return;
     if(result.status==='paid'){setPhase('paid');router.refresh();return;}
     if(result.status&&['failed','cancelled','expired'].includes(result.status)){setPhase('unpaid');router.refresh();return;}
     if(result.status&&attempt===attempts-1){setPhase('waiting');return;}
     if(result.error&&attempt===attempts-1){setPhase('error');return;}
    }catch{if(attempt===attempts-1){setPhase('error');return;}}
   }
  })();
  return ()=>{active.current=false;};
 },[intent,round,router]);
 // Bank transfers can take minutes: keep checking quietly for about five minutes.
 useEffect(()=>{if((phase!=='waiting'&&phase!=='error')||round>=20)return;const timer=setTimeout(()=>setRound(value=>value+1),15000);return ()=>clearTimeout(timer);},[phase,round]);
 useEffect(()=>{
  if(!backlog.length)return;let stopped=false;
  (async()=>{for(const id of backlog){try{const result=await check(id);if(stopped)return;if(result.status==='paid'){setPhase('paid');router.refresh();}else if(result.status&&['failed','cancelled','expired'].includes(result.status))router.refresh();}catch{/* The next chat load tries again. */}}})();
  return ()=>{stopped=true;};
 },[backlog,router]);
 useEffect(()=>{if(phase!=='paid')return;const timer=setTimeout(()=>setPhase('done'),8000);return ()=>clearTimeout(timer);},[phase]);
 if(phase==='done')return null;
 return <div className="payment-return">
  {phase==='checking'&&<div className="payment-return__checking" role="status"><span className="spinner" aria-hidden="true" />Confirming your payment with Bachs…</div>}
  {phase==='paid'&&<Notice title="Payment received" tone="success" live>Your receipt is in the chat below, and {name} has seen it.</Notice>}
  {phase==='waiting'&&<Notice title="Payment not confirmed yet" tone="warning" live><p>Bank transfers can take a few minutes. We’ll keep checking, and your receipt will appear here once Bachs confirms it.</p><Button variant="secondary" onClick={()=>setRound(value=>value+1)}>Check now</Button></Notice>}
  {phase==='unpaid'&&<Notice title="Payment not completed" tone="warning" live><p>No money was taken for this attempt.</p><Link className="button button--secondary" href={`/gifts/${conversation}`}>Try again</Link></Notice>}
  {phase==='error'&&<Notice title="Still confirming your payment" tone="warning" live><p>We couldn’t reach Bachs just now. We’ll keep trying, and you can leave this chat; it’s checked again whenever you return.</p><Button variant="secondary" onClick={()=>setRound(value=>value+1)}>Check now</Button></Notice>}
 </div>;
}
