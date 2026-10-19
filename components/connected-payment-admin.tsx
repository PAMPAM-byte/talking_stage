import Link from 'next/link';
import {currentAccount} from '@/lib/backend/server';
import type {GiftIntent} from '@/lib/backend/payment-service';
import {GiftReceipt,giftLabels} from './connected-payments';
import {CheckGiftStatus} from './connected-gift-form';
import {EmptyState,Notice} from './ui/primitives';
import {formatNaira} from '@/lib/format';
export async function ConnectedPaymentAdmin({id}:{id?:string}){
 const account=await currentAccount();if(!account)return null;
 if(id&&!/^[a-f0-9-]{36}$/i.test(id))return <Notice title="Payment unavailable">Choose a payment from the ledger.</Notice>;
 const result=await account.client.rpc('admin_gift_ledger',{p_id:id??null});
 if(result.error)return <Notice title="Ledger unavailable">Check administrator access and reload.</Notice>;
 const data=result.data as {payments:(GiftIntent&{character_name:string})[];events:{id:string;event_type:string;verification_result:string;received_at:string}[]};
 const intent=id?data.payments[0]:null;
 return <section className="stack"><h1 className="display page-title">{id?'Gift payment review':'Payment ledger'}</h1>{id?<><Link href="/admin/payments">Back to ledger</Link>{intent?<><GiftReceipt intent={intent} name={intent.character_name}/><CheckGiftStatus id={intent.id} admin/><p className="supporting muted">Reconciliation reads Bachs and applies verified state. It cannot manually mark a payment paid.</p><h2>Verified deliveries</h2>{data.events.map(event=><article className="card" key={event.id}><strong>{event.event_type}</strong><p>{event.verification_result}</p><time dateTime={event.received_at}>{new Date(event.received_at).toLocaleString('en-NG',{timeZone:'Africa/Lagos'})}</time></article>)}</>:<EmptyState title="Payment not found">Choose a payment from the ledger.</EmptyState>}</>:data.payments.length?<>{data.payments.map(payment=><Link className="payment-history-row" key={payment.id} href={`/admin/payments/${payment.id}`}><span>{payment.character_name} · {formatNaira(Number(payment.amount_minor))}</span><span>{payment.needs_review?'Needs review':giftLabels[payment.status]}</span></Link>)}<p className="caption muted">Latest 50 records. Sandbox transactions are labelled on their receipt.</p></>:<EmptyState title="No payments yet">Confirmed gift attempts will appear here.</EmptyState>}</section>;
}
