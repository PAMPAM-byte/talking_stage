"use client";
import {useId,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {createGiftAction,checkGiftAction} from '@/lib/backend/payment-actions';
import {adminCheckGiftAction,declineGiftAction} from '@/lib/backend/payment-actions';
import Link from 'next/link';
import {formatNaira,parseNaira} from '@/lib/format';
import {Button,TextField,Notice} from './ui/primitives';
export function ConnectedGiftForm({conversation,name,recipient,minimum,maximum,sandbox,action=createGiftAction}:{conversation:string;name:string;recipient:string;minimum:number;maximum:number;sandbox:boolean;action?:typeof createGiftAction}){
 const [amount,setAmount]=useState(''),[review,setReview]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const operation=useRef<string|null>(null);const [attempted,setAttempted]=useState(false);const router=useRouter();
 const amountId=useId();const [touched,setTouched]=useState(false);
 const minor=parseNaira(amount);
 const valid=minor!==null&&minor>=minimum&&minor<=maximum;
 const amountError=!amount.trim()?'Enter an amount to continue.':minor===null?'Enter a valid amount, such as 50,000 or 50,000.50.':minor<minimum?`The minimum payment is ${formatNaira(minimum)}. Enter ${formatNaira(minimum)} or more.`:minor>maximum?`The maximum payment is ${formatNaira(maximum)}. Enter ${formatNaira(maximum)} or less.`:'';
 async function submit(){
  if(busy)return;
  if(!valid){setTouched(true);document.getElementById(amountId)?.focus();return;}
  if(!review){setReview(true);return;}
  setBusy(true);setError('');operation.current??=crypto.randomUUID();setAttempted(true);
  const data=new FormData();data.set('conversation',conversation);data.set('operation',operation.current);data.set('amount',amount);data.set('confirmed','yes');
  try{const result=await action(data);if(result.id)router.push(`/payments/${result.id}`);else setError(result.error??'Checkout unavailable.');}
  catch{setError('We could not confirm checkout. Retry this same attempt.');}
  finally{setBusy(false);}
 }
 return <form className="stack" onSubmit={event=>{event.preventDefault();void submit();}}>
  {sandbox&&<Notice title="Sandbox payment">This is a test payment. No real money moves.</Notice>}
  {review?<div className="receipt-summary stack"><strong className="receipt-amount tabular">{minor===null?'':formatNaira(minor)}</strong><dl className="receipt-fields"><div><dt>For</dt><dd>{name} TalkingStage</dd></div><div><dt>Payment recipient</dt><dd>{recipient}</dd></div><div><dt>Purpose</dt><dd>Voluntary payment</dd></div></dl><p className="supporting muted">Giving is optional. It does not buy affection, messages or photo access.</p><p className="supporting muted">Next, open Bachs checkout to choose a payment method and pay. Confirming this amount does not send money.</p></div>:<div aria-live="polite"><TextField id={amountId} name="amount" label="Amount in NGN" value={amount} onChange={event=>setAmount(event.target.value)} onBlur={()=>setTouched(true)} inputMode="decimal" autoComplete="off" maxLength={40} error={touched||amount.length>0?amountError:undefined} hint={`${formatNaira(minimum)} to ${formatNaira(maximum)}. Choose an amount you are comfortable with.`}/></div>}
  {error&&<Notice title="Checkout not confirmed" tone="warning" live>{error}</Notice>}
  <div className="row">{review&&!attempted&&<Button variant="quiet" disabled={busy} onClick={()=>setReview(false)}>Change amount</Button>}<Button type="submit" loading={busy}>{review?error?'Retry this checkout':`Continue to checkout (${minor===null?'payment':formatNaira(minor)})`:'Review payment'}</Button></div>
 </form>;
}
export function CheckGiftStatus({id,admin=false}:{id:string;admin?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const router=useRouter();
 return <div className="stack"><Button variant="secondary" loading={busy} onClick={async()=>{setBusy(true);setError('');try{const data=new FormData();data.set('id',id);const result=await (admin?adminCheckGiftAction:checkGiftAction)(data);setError(result.error??'');router.refresh();}catch{setError('Verification is unavailable. Your last known status is unchanged.');}finally{setBusy(false);}}}>Check payment status</Button>{error&&<Notice title="Status unchanged" tone="warning" live>{error}</Notice>}</div>;
}
export function GiftProposalControl({id,conversation,amount,declined}:{id:string;conversation:string;amount:number;declined:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const router=useRouter();
 return <div className="payment-card stack"><p className="supporting">Optional payment request: <strong>{formatNaira(amount)}</strong></p>{declined?<p className="caption muted">Declined. Requests are stopped for this conversation.</p>:<><p className="caption muted">You can choose another amount or keep chatting without giving.</p><div className="row"><Link className="button button--secondary" href={`/gifts/${conversation}`}>Review payment</Link><Button variant="quiet" loading={busy} onClick={async()=>{setBusy(true);setError('');try{const form=new FormData();form.set('id',id);const result=await declineGiftAction(form);setError(result.error??'');router.refresh();}catch{setError('Could not save your choice. Try again.');}finally{setBusy(false);}}}>No thanks</Button></div></>}{error&&<Notice title="Choice not saved" tone="warning" live>{error}</Notice>}</div>;
}
