"use client";
import {useState} from 'react';
import {ConnectedGiftForm} from '@/components/connected-gift-form';
import {GiftReceipt} from '@/components/gift-receipt';
import {ChatMessageContent} from '@/components/chat-expression';
import {GIFT_LINK_TOKEN} from '@/lib/payments/gift-link.mjs';
export default function GiftPreview(){
 const [attempts,setAttempts]=useState<string[]>([]);
 return <main ref={element=>{element?.setAttribute('data-hydrated','true');}} className="container space-page stack gift-page"><p className="caption muted">Development fixture · no payment service is contacted</p><h1 className="display page-title">Send money to Amara TalkingStage</h1><div className="payment-card"><ConnectedGiftForm conversation="00000000-0000-4000-8000-000000000001" name="Amara" recipient="Synthetic registered operator" minimum={200000} maximum={100000000} sandbox action={async form=>{setAttempts(current=>[...current,String(form.get('operation'))]);return {error:'Synthetic lost checkout response. Retry the same attempt.'};}}/></div><output aria-label="Synthetic attempt identifiers">{attempts.join(',')}</output><section aria-label="Payment button example" className="message-turn"><ChatMessageContent text={`Ahn ahn, you want to spoil me today? 🙈

${GIFT_LINK_TOKEN}`} giftHref="/gifts/00000000-0000-4000-8000-000000000001"/></section><section aria-label="Receipt examples" className="stack gift-receipt-examples">{(["paid","pending","failed"] as const).map(status=><div key={status} className="message-turn message-turn--system"><GiftReceipt name="Amara" intent={{id:`00000000-0000-4000-8000-00000000001${status.length}`,user_id:"",conversation_id:"",character_id:"",amount_minor:500000,currency:"NGN",reference:"TS-6f1c2a9e-4b7d-4e21-9c3a-1d2e3f4a5b6c",recipient_disclosure:"Talking Stage",status,needs_review:false,created_at:"2026-11-02T15:58:00Z",verified_at:status==="pending"?null:"2026-11-02T15:59:12Z",expires_at:null,gateway_environment:"production",gateway_organization_id:"acct_synthetic",gateway_checkout_id:null,checkout_url:null}}/></div>)}</section></main>;
}
