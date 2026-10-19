import Link from 'next/link';
import {currentAccount} from '@/lib/backend/server';
import {bachsSettings} from '@/lib/payments/bachs.mjs';
import {type GiftIntent,safeGiftCheckout} from '@/lib/backend/payment-service';
import {formatNaira} from '@/lib/format';
import {Badge,EmptyState,Notice} from './ui/primitives';
import {ConnectedGiftForm,CheckGiftStatus} from './connected-gift-form';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const giftLabels:Record<string,string>={awaiting_checkout:'Checkout not confirmed',pending:'Pending verification',paid:'Payment confirmed',failed:'Payment failed',cancelled:'Checkout cancelled',expired:'Checkout expired',refunded:'Refunded',disputed:'Payment disputed'};
const descriptions:Record<string,string>={awaiting_checkout:'Checkout has not been confirmed. Return to your gift and retry the same attempt.',pending:'The payment has not been confirmed yet. A checkout redirect or screenshot does not confirm receipt.',paid:'The gateway has confirmed this gift payment.',failed:'The gateway reports that this payment attempt failed.',cancelled:'The gateway reports that this checkout was cancelled.',expired:'The gateway reports that this checkout expired.',refunded:'The gateway reports that the full payment was refunded.',disputed:'This payment is under dispute and requires review.'};
export function GiftReceipt({intent,name}:{intent:GiftIntent;name:string}){
 return <div className="payment-card stack"><div className="receipt-heading"><Badge>{intent.gateway_environment==='sandbox'?'Sandbox gift':'Voluntary gift'}</Badge><Badge tone={intent.needs_review?'warning':intent.status==='paid'?'success':'neutral'}>{intent.needs_review?'Needs review':giftLabels[intent.status]??'Status unavailable'}</Badge></div><strong className="receipt-amount tabular">{formatNaira(Number(intent.amount_minor))} <span>NGN</span></strong><dl className="receipt-fields"><div><dt>Gift for</dt><dd>{name}</dd></div><div><dt>Received by</dt><dd>{intent.recipient_disclosure}</dd></div></dl><p className="caption muted tabular">Reference: {intent.reference}</p>{intent.gateway_environment==='sandbox'&&<p className="caption muted">Test transaction. No real money moved.</p>}</div>;
}
export async function ConnectedGift({conversation}:{conversation:string}){
 const account=await currentAccount();if(!account)return null;
 const result=uuid.test(conversation)?await account.client.rpc('gift_settings',{p_conversation:conversation}):{data:null,error:true};
 const settings=result.data as {available:boolean;recipient:string;characterName:string;minimum:number;maximum:number;environment:string}|null;
 return <section className="space-page stack"><Link href={`/messages/${conversation}`}>Back to conversation</Link><h1 className="display page-title">{settings?`A gift for ${settings.characterName}`:'Send a gift'}</h1>{result.error||!settings?<EmptyState title="Gift unavailable">Reload the conversation to try again.</EmptyState>:!settings.available||!bachsSettings()?<Notice title="Payments are not available yet">You can keep chatting. Gifts will become available when payment setup is complete.</Notice>:<ConnectedGiftForm conversation={conversation} name={settings.characterName} recipient={settings.recipient} minimum={Number(settings.minimum)} maximum={Number(settings.maximum)} sandbox={settings.environment==='sandbox'}/>}</section>;
}
export async function ConnectedPaymentDetail({id}:{id:string}){
 const account=await currentAccount();if(!account)return null;
 const result=uuid.test(id)?await account.client.from('payment_intents').select('*').eq('id',id).eq('user_id',account.user.id).maybeSingle():{data:null,error:true};
 if(result.error||!result.data)return <section className="space-page"><EmptyState title="Payment unavailable" action={<Link href="/settings/payments">Payment history</Link>}>This payment could not be loaded for your account.</EmptyState></section>;
 const intent=result.data as GiftIntent;
 const character=await account.client.from('characters').select('name').eq('id',intent.character_id).maybeSingle();
 const checkout=safeGiftCheckout(intent);
 const settings=await account.client.rpc('gift_settings',{p_conversation:intent.conversation_id});
 const runtime=bachsSettings();
 const canCheckout=!!runtime&&runtime.environment===intent.gateway_environment&&runtime.organizationId===intent.gateway_organization_id&&settings.data?.environment===intent.gateway_environment&&settings.data?.available===true&&['awaiting_checkout','pending'].includes(intent.status)&&!intent.needs_review;
 return <section className="space-page stack"><Link href="/settings/payments">Payment history</Link><h1 className="display page-title">Gift receipt</h1><GiftReceipt intent={intent} name={character.data?.name??'Fictional character'}/><Notice title={intent.needs_review?'Payment needs review':giftLabels[intent.status]??'Status unavailable'}>{intent.needs_review?'This payment has an amount or refund difference that requires review. It is not a newly confirmed gift.':descriptions[intent.status]}</Notice>{checkout&&canCheckout&&<><a href={checkout} className="button button--primary" rel="noreferrer">Continue to Bachs checkout</a><p className="caption muted">Choose bank transfer at checkout to see the account details and transfer deadline provided for this payment.</p></>}<CheckGiftStatus id={id}/><Link href={`/messages/${intent.conversation_id}`}>Back to conversation</Link>{['failed','expired','cancelled'].includes(intent.status)&&<Link href={`/gifts/${intent.conversation_id}`}>Review a new gift</Link>}</section>;
}
export async function ConnectedPaymentHistory(){
 const account=await currentAccount();if(!account)return null;
 const result=await account.client.from('payment_intents').select('*').eq('user_id',account.user.id).order('created_at',{ascending:false}).limit(50);
 const rows=(result.data??[]) as GiftIntent[];
 return <section className="space-page stack"><Link href="/settings">Back to settings</Link><h1 className="display page-title">Payment history</h1>{result.error?<Notice title="History unavailable">Reload to try again.</Notice>:rows.length?<>{rows.map(intent=><Link className="payment-history-row" key={intent.id} href={`/payments/${intent.id}`}><span><strong>{formatNaira(Number(intent.amount_minor))}</strong><span className="caption muted"> {intent.gateway_environment==='sandbox'?'Sandbox gift':'Voluntary gift'}</span></span><span>{intent.needs_review?'Needs review':giftLabels[intent.status]}</span></Link>)}{rows.length===50&&<p className="caption muted">Showing your latest 50 payments.</p>}</>:<EmptyState title="No gifts yet">Gifts you confirm will appear here. Giving is always optional.</EmptyState>}</section>;
}
