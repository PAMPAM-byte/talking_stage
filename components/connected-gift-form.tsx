"use client";
import {useId,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {createGiftAction,checkGiftAction} from '@/lib/backend/payment-actions';
import {adminCheckGiftAction,declineGiftAction} from '@/lib/backend/payment-actions';
import Link from 'next/link';
import {formatNaira,parseNaira} from '@/lib/format';
import {Button,Chip,TextField,Notice} from './ui/primitives';
const quickAmounts=[200000,500000,1000000,2000000];
// One screen: pick an amount, see who receives it, pay. Checkout opens in this tab and returns to the chat.
export function ConnectedGiftForm({conversation,name,recipient,minimum,maximum,sandbox,action=createGiftAction}:{conversation:string;name:string;recipient:string;minimum:number;maximum:number;sandbox:boolean;action?:typeof createGiftAction}){
 const [amount,setAmount]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const operation=useRef<string|null>(null);const [attempted,setAttempted]=useState(false);const router=useRouter();
 const amountId=useId();const [touched,setTouched]=useState(false);
 const minor=parseNaira(amount);
 const valid=minor!==null&&minor>=minimum&&minor<=maximum;
 const amountError=!amount.trim()?'Choose or enter an amount to continue.':minor===null?'Enter a valid amount, such as 50,000 or 50,000.50.':minor<minimum?`The minimum payment is ${formatNaira(minimum)}. Enter ${formatNaira(minimum)} or more.`:minor>maximum?`The maximum payment is ${formatNaira(maximum)}. Enter ${formatNaira(maximum)} or less.`:'';
 const presets=quickAmounts.filter(value=>value>=minimum&&value<=maximum);
 async function submit(){
  if(busy)return;
  if(!valid){setTouched(true);document.getElementById(amountId)?.focus();return;}
  setBusy(true);setError('');operation.current??=crypto.randomUUID();setAttempted(true);
  const data=new FormData();data.set('conversation',conversation);data.set('operation',operation.current);data.set('amount',amount);data.set('confirmed','yes');
  try{
   const result=await action(data);
   if(result.checkout){window.location.assign(result.checkout);return;}
   if(result.id)router.push(`/payments/${result.id}`);else setError(result.error??'Checkout unavailable.');
  }catch{setError('We could not open checkout. Retry this same payment; you will not be charged twice.');}
  setBusy(false);
 }
 return <form className="gift-form" noValidate onSubmit={event=>{event.preventDefault();void submit();}}>
  {sandbox&&<Notice title="Sandbox payment">This is a test payment. No real money moves.</Notice>}
  <fieldset className="gift-amounts" disabled={attempted}>
   <legend className="field__label">Choose an amount</legend>
   {presets.length>0&&<div className="gift-amounts__presets">{presets.map(value=><Chip key={value} selected={minor===value} onClick={()=>{setAmount((value/100).toLocaleString('en-NG'));setTouched(false);}}>{formatNaira(value)}</Chip>)}</div>}
   <TextField id={amountId} name="amount" label="Or enter another amount" value={amount} onChange={event=>setAmount(event.target.value)} onBlur={()=>setTouched(true)} inputMode="decimal" autoComplete="off" maxLength={40} error={(touched||amount.length>0)&&amountError?amountError:undefined} hint={`${formatNaira(minimum)} to ${formatNaira(maximum)}, in naira.`} />
  </fieldset>
  <div className="gift-form__tear" aria-hidden="true" />
  <dl className="receipt-fields">
   <div><dt>For</dt><dd>{name} · TalkingStage</dd></div>
   <div><dt>Received by</dt><dd>{recipient}</dd></div>
   <div><dt>Purpose</dt><dd>Voluntary payment</dd></div>
  </dl>
  <p className="caption muted">Giving is optional. It doesn’t buy affection, messages or photos.</p>
  {error&&<Notice title="Checkout didn’t open" tone="warning" live>{error}</Notice>}
  <Button type="submit" className="gift-form__pay" loading={busy}>{busy?'Opening secure checkout…':error?'Retry payment':valid&&minor!==null?`Pay ${formatNaira(minor)}`:'Pay'}</Button>
  <p className="caption muted gift-form__note">You’ll pay on Bachs’ secure checkout, then come straight back to your chat with {name}.</p>
 </form>;
}
export function CheckGiftStatus({id,admin=false}:{id:string;admin?:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const router=useRouter();
 return <div className="stack"><Button variant="secondary" loading={busy} onClick={async()=>{setBusy(true);setError('');try{const data=new FormData();data.set('id',id);const result=await (admin?adminCheckGiftAction:checkGiftAction)(data);setError(result.error??'');router.refresh();}catch{setError('Verification is unavailable. Your last known status is unchanged.');}finally{setBusy(false);}}}>Check payment status</Button>{error&&<Notice title="Status unchanged" tone="warning" live>{error}</Notice>}</div>;
}
export function GiftProposalControl({id,conversation,amount,declined}:{id:string;conversation:string;amount:number;declined:boolean}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const router=useRouter();
 return <div className="payment-card stack"><p className="supporting">Optional payment request: <strong>{formatNaira(amount)}</strong></p>{declined?<p className="caption muted">Declined. No problem, keep chatting.</p>:<><p className="caption muted">Totally optional. You can choose another amount, or keep chatting without giving.</p><div className="row"><Link className="button button--primary" href={`/gifts/${conversation}`}>Send money</Link><Button variant="quiet" loading={busy} onClick={async()=>{setBusy(true);setError('');try{const form=new FormData();form.set('id',id);const result=await declineGiftAction(form);setError(result.error??'');router.refresh();}catch{setError('Could not save your choice. Try again.');}finally{setBusy(false);}}}>No thanks</Button></div></>}{error&&<Notice title="Choice not saved" tone="warning" live>{error}</Notice>}</div>;
}
