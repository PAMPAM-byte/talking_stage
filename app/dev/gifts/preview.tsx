"use client";
import {useState} from 'react';
import {ConnectedGiftForm} from '@/components/connected-gift-form';
export default function GiftPreview(){
 const [attempts,setAttempts]=useState<string[]>([]);
 return <main className="container space-page stack"><p className="caption muted">Development fixture · no payment service is contacted</p><h1 className="display page-title">Send money to Amara TalkingStage</h1><div className="card"><ConnectedGiftForm conversation="00000000-0000-4000-8000-000000000001" name="Amara" recipient="Synthetic registered operator" minimum={200000} maximum={100000000} sandbox action={async form=>{setAttempts(current=>[...current,String(form.get('operation'))]);return {error:'Synthetic lost checkout response. Retry the same attempt.'};}}/></div><output aria-label="Synthetic attempt identifiers">{attempts.join(',')}</output></main>;
}
