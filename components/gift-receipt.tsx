import type {GiftIntent} from '@/lib/backend/payment-service';
import {formatNaira} from '@/lib/format';
import {Badge} from './ui/primitives';
import {Icon} from './ui/icon';
const receiptHeadings:Record<string,string>={paid:'Payment received',pending:'Payment pending',awaiting_checkout:'Awaiting checkout',failed:'Payment failed',cancelled:'Checkout cancelled',expired:'Checkout expired',refunded:'Payment refunded',disputed:'Payment disputed'};
const receiptTone=(intent:GiftIntent)=>intent.needs_review||intent.status==='disputed'?'warning':intent.status==='paid'?'success':intent.status==='pending'?'warning':['failed'].includes(intent.status)?'danger':'neutral';
const receiptDate=(value:string)=>new Intl.DateTimeFormat('en-NG',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',timeZone:'Africa/Lagos'}).format(new Date(value));
// A receipt, not a reward: verified state first, then the amount, then the ledger facts below a tear line.
export function GiftReceipt({intent,name}:{intent:GiftIntent;name:string}){
 const tone=receiptTone(intent);const paid=['paid','refunded','disputed'].includes(intent.status);
 return <div className={`payment-card receipt receipt--${tone}`}>
  <div className="receipt__status"><span className="receipt__icon" aria-hidden="true"><Icon name={tone==='success'?'check':tone==='neutral'?'payment':'warning'} /></span><strong>{intent.needs_review?'Payment needs review':receiptHeadings[intent.status]??'Status unavailable'}</strong>{intent.gateway_environment==='sandbox'&&<Badge>Sandbox</Badge>}</div>
  <p className="receipt-amount tabular">{formatNaira(Number(intent.amount_minor))} <span>NGN</span></p>
  <div className="receipt__tear" aria-hidden="true" />
  <dl className="receipt-fields">
   <div><dt>For</dt><dd>{name} · TalkingStage</dd></div>
   <div><dt>{paid?'Paid to':'Payment recipient'}</dt><dd>{intent.recipient_disclosure}</dd></div>
   <div><dt>Date</dt><dd className="tabular">{receiptDate(intent.verified_at??intent.created_at)}</dd></div>
   <div><dt>Reference</dt><dd className="receipt__reference tabular">{intent.reference}</dd></div>
  </dl>
  {intent.gateway_environment==='sandbox'&&<p className="caption muted">Sandbox transaction. No real money moves.</p>}
 </div>;
}
