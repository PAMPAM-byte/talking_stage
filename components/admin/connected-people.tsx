import {currentAccount} from '@/lib/backend/server';
import {Badge,Card,EmptyState,Notice} from '@/components/ui/primitives';
import {formatNaira} from '@/lib/format';

// Founder request, 9 November 2026: look up one person's spend, reply limit, payments and
// activity. Lives on its own page so the Operations auto-refresh never repeats a lookup.
type Person={id:string;email:string|null;name:string;joinedAt:string;lastSignInAt:string|null;signInMethods:string[];isAdmin:boolean;onboardingComplete:boolean;
 bannedUntil:string|null;deletionScheduledFor:string|null;
 ai:{usedMicroUsd:number;limitMicroUsd:number;creditMicroUsd:number;baseLimitMicroUsd:number;replyCostMicroUsd:number;atLimit:boolean;callsToday:number};
 payments:{paidMinor:number;payments:number;lastPaidAt:string|null};
 activity:{messagesSent:number;messagesToday:number;lastMessageAt:string|null;characters:number};topCharacters:string[]};
const usd=(micro:number)=>`$${(Math.max(0,micro)/1e6).toFixed(2)}`;
const count=(value:number)=>new Intl.NumberFormat('en-NG').format(value);
const lagos=(value:string|null,withYear=false)=>value?new Intl.DateTimeFormat('en-NG',{day:'numeric',month:'short',...(withYear?{year:'numeric'}:{}),hour:'numeric',minute:'2-digit',timeZone:'Africa/Lagos'}).format(new Date(value)):null;
const methods:Record<string,string>={email:'Email',google:'Google'};

function ReplyLimit({ai}:{ai:Person['ai']}){
 const share=ai.limitMicroUsd>0?Math.min(100,Math.round(ai.usedMicroUsd/ai.limitMicroUsd*100)):0;
 // Where the standard limit ends when payments have extended it today.
 const base=ai.creditMicroUsd>0&&ai.limitMicroUsd>0?Math.round(ai.baseLimitMicroUsd/ai.limitMicroUsd*100):null;
 return <div className={`person__limit${ai.atLimit?' is-reached':''}`}>
  <div className="person__limit-head"><span><b>Today&apos;s reply limit</b></span><Badge tone={ai.atLimit?'warning':'success'}>{ai.atLimit?'Limit reached':'Can chat'}</Badge></div>
  <p className="person__limit-figure"><strong>{usd(ai.usedMicroUsd)}</strong> <span className="muted">of {usd(ai.limitMicroUsd)} used</span></p>
  <span className="person__meter" role="img" aria-label={`${share}% of today's limit used`}><span style={{inlineSize:`${share}%`}}/>{base!==null&&<i style={{insetInlineStart:`${base}%`}}/>}</span>
  <p className="caption muted">{count(ai.callsToday)} AI {ai.callsToday===1?'reply':'replies'} today.{' '}
   {ai.creditMicroUsd>0?`Payments added ${usd(ai.creditMicroUsd)} to the ${usd(ai.baseLimitMicroUsd)} standard limit. `:''}
   {ai.atLimit?`Less than ${usd(ai.replyCostMicroUsd)} (the most one reply can cost) is left, so replies are paused. `:''}Resets at 1am Lagos time.</p>
 </div>;
}

function PersonCard({p}:{p:Person}){
 const banned=p.bannedUntil&&new Date(p.bannedUntil)>new Date();
 return <Card className="stack person"><div className="person__head">
   <div><h2>{p.name.trim()||'No name yet'}</h2><p className="person__email">{p.email??'No email'}</p></div>
   <div className="person__badges">{p.isAdmin&&<Badge tone="success">Admin</Badge>}{p.signInMethods.map(m=><Badge key={m}>{methods[m]??m}</Badge>)}
    {!p.onboardingComplete&&<Badge tone="warning">Setup not finished</Badge>}{banned&&<Badge tone="danger">Banned</Badge>}{p.deletionScheduledFor&&<Badge tone="danger">Deletion scheduled</Badge>}</div>
  </div>
  {p.deletionScheduledFor&&<Notice title="Account scheduled for deletion" tone="warning">Erased after {lagos(p.deletionScheduledFor,true)}.</Notice>}
  <ReplyLimit ai={p.ai}/>
  <dl className="activity__grid">
   <div><dt>Paid in total</dt><dd>{formatNaira(Number(p.payments.paidMinor))}</dd><p className="caption muted">{p.payments.payments?`${count(p.payments.payments)} payment${p.payments.payments===1?'':'s'} · latest ${lagos(p.payments.lastPaidAt)}`:'No payments yet'}</p></div>
   <div><dt>Messages sent</dt><dd>{count(p.activity.messagesSent)}</dd><p className="caption muted">{count(p.activity.messagesToday)} today</p></div>
   <div><dt>Last message</dt><dd className="person__when">{lagos(p.activity.lastMessageAt)??'Never'}</dd><p className="caption muted">{p.activity.lastMessageAt?'Lagos time':'No messages yet'}</p></div>
   <div><dt>Chats with</dt><dd>{count(p.activity.characters)}</dd><p className="caption muted">{p.topCharacters.length?`Mostly ${p.topCharacters.join(', ')}`:'No conversations yet'}</p></div>
  </dl>
  <p className="caption muted">Joined {lagos(p.joinedAt,true)} · last signed in {lagos(p.lastSignInAt,true)??'never'} · Account ID <span className="person__id">{p.id}</span></p>
 </Card>;
}

export async function ConnectedPeople({q}:{q?:string}){
 const account=await currentAccount();if(!account)return null;
 const query=(q??'').trim();
 const result=query.length>=3?await account.client.rpc('admin_user_lookup',{p_query:query}):null;
 const people=(result?.data as {users:Person[]}|null)?.users??[];
 return <div className="stack"><h1 className="display page-title">Look up a person</h1>
  <p className="muted">See one person&apos;s reply limit, spend, payments and activity. Message text is never shown, and each lookup is recorded in Activity.</p>
  <form className="person-search" action="/admin/people" role="search">
   <label className="field">Email, name or account ID<input className="field__control" type="search" name="q" defaultValue={query} minLength={3} maxLength={254} required autoComplete="off" spellCheck={false} placeholder="e.g. tolu@gmail.com"/></label>
   <button className="button button--primary">Look up</button>
  </form>
  {query&&query.length<3?<Notice title="Type at least 3 characters" tone="warning">Part of an email or name works, for example &ldquo;tolu&rdquo;.</Notice>
  :result?.error?<Notice title="Lookup unavailable" tone="warning">Try again in a moment.</Notice>
  :result&&!people.length?<EmptyState title={`No one matches “${query}”`} icon="people">Check the spelling, or try part of the email before the @.</EmptyState>
  :result?<>{people.length>1&&<p className="caption muted">{people.length} matches, best match first{people.length===5?'. Showing the first 5; type more to narrow it down':''}.</p>}{people.map(p=><PersonCard key={p.id} p={p}/>)}</>
  :<EmptyState title="Search for someone" icon="people">Their spend against today&apos;s limit, payments and activity appear here.</EmptyState>}
 </div>;
}
