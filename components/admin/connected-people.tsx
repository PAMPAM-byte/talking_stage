import Link from 'next/link';
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

type Row={id:string;email:string|null;name:string;joinedAt:string;isAdmin:boolean;onboardingComplete:boolean;banned:boolean;deletionScheduled:boolean;
 usedMicroUsd:number;limitMicroUsd:number;atLimit:boolean;paidMinor:number;payments:number;messagesSent:number;messagesToday:number;lastMessageAt:string|null};
type Everyone={counts:{all:number;limit:number;paid:number};total:number;page:number;perPage:number;users:Row[]};
type Filter='all'|'limit'|'paid';
const filters:{key:Filter;label:string;empty:string}[]=[
 {key:'all',label:'Everyone',empty:'No accounts yet'},
 {key:'limit',label:'Hit limit today',empty:'No one has hit their reply limit today'},
 {key:'paid',label:'Paid',empty:'No one has made a live payment yet'}];
const ago=(value:string|null)=>{if(!value)return 'Never';const minutes=Math.max(1,Math.round((Date.now()-new Date(value).getTime())/60000));
 return minutes<60?`${minutes} min ago`:minutes<1440?`${Math.round(minutes/60)} h ago`:minutes<10080?`${Math.round(minutes/1440)} d ago`:lagos(value);};
const href=(filter:Filter,page=1)=>{const params=new URLSearchParams();if(filter!=='all')params.set('filter',filter);if(page>1)params.set('page',String(page));const query=params.toString();return `/admin/people${query?`?${query}`:''}`;};

async function EveryoneList({client,filter,page}:{client:NonNullable<Awaited<ReturnType<typeof currentAccount>>>['client'];filter:Filter;page:number}){
 const result=await client.rpc('admin_user_list',{p_filter:filter,p_page:page});
 if(result.error)return <Notice title="People unavailable" tone="warning">Reload to try again.</Notice>;
 const data=result.data as Everyone;const pages=Math.max(1,Math.ceil(data.total/data.perPage));
 const current=filters.find(f=>f.key===filter)??filters[0];
 return <>
  <nav className="people-filters" aria-label="Filter people">{filters.map(f=><Link key={f.key} href={href(f.key)} className={`people-filter${f.key===filter?' is-active':''}`} aria-current={f.key===filter?'page':undefined}>{f.label}<span>{count(data.counts[f.key])}</span></Link>)}</nav>
  {!data.users.length?<EmptyState title={current.empty} icon="people">{filter==='all'?'People appear here after they sign up.':'Check back later, or look at everyone.'}</EmptyState>:
  <div className="ai-spend__scroll" tabIndex={0} role="region" aria-label={`${current.label}, most recently active first`}><table className="ai-spend__table people__table">
   <thead><tr><th scope="col">Person</th><th scope="col">Today&apos;s limit</th><th scope="col">Paid</th><th scope="col">Messages</th><th scope="col">Last message</th></tr></thead>
   <tbody>{data.users.map(u=>{const share=u.limitMicroUsd>0?Math.min(100,Math.round(u.usedMicroUsd/u.limitMicroUsd*100)):0;return <tr key={u.id}>
    <th scope="row"><Link className="people__who" href={`/admin/people?q=${u.id}`}><b>{u.name.trim()||'No name yet'}</b><span className="caption muted">{u.email??'No email'}</span></Link>
     <span className="people__tags">{u.isAdmin&&<Badge tone="success">Admin</Badge>}{!u.onboardingComplete&&<Badge tone="warning">Setup not finished</Badge>}{u.banned&&<Badge tone="danger">Banned</Badge>}{u.deletionScheduled&&<Badge tone="danger">Deletion scheduled</Badge>}</span></th>
    <td>{u.atLimit?<Badge tone="warning">Limit reached</Badge>:<span className="ai-spend__amount">{usd(u.usedMicroUsd)} <span className="muted">of {usd(u.limitMicroUsd)}</span></span>}
     <span className={`ai-spend__meter${u.atLimit?' is-reached':''}`} role="img" aria-label={`${share}% of today's limit used`}><span style={{inlineSize:`${share}%`}}/></span></td>
    <td>{u.payments?<>{formatNaira(Number(u.paidMinor))}<span className="caption muted"> · {count(u.payments)}</span></>:<span className="muted">—</span>}</td>
    <td>{count(u.messagesSent)}{u.messagesToday>0&&<span className="caption muted"> · {count(u.messagesToday)} today</span>}</td>
    <td>{ago(u.lastMessageAt)}</td></tr>;})}</tbody></table></div>}
  {pages>1&&<div className="row people-pages">{page>1&&<Link className="button button--secondary" href={href(filter,page-1)}>Previous</Link>}<span className="caption muted">Page {page} of {pages}</span>{page<pages&&<Link className="button button--secondary" href={href(filter,page+1)}>Next</Link>}</div>}
  <p className="caption muted">Most recently active first. Tap a name for their full details. Spend and limit use today&apos;s UTC day, which resets at 1am Lagos time. Paid counts confirmed live payments only.</p>
 </>;
}

export async function ConnectedPeople({q,filter,page}:{q?:string;filter?:string;page?:string}){
 const account=await currentAccount();if(!account)return null;
 const query=(q??'').trim();
 const chosen:Filter=filter==='limit'||filter==='paid'?filter:'all';
 const pageNumber=Math.min(1000,Math.max(1,Math.floor(Number(page))||1));
 const result=query.length>=3?await account.client.rpc('admin_user_lookup',{p_query:query}):null;
 const people=(result?.data as {users:Person[]}|null)?.users??[];
 return <div className="stack"><h1 className="display page-title">People</h1>
  <p className="muted">Everyone with an account: their reply limit today, payments and activity. Message text is never shown, and each view is recorded in Activity.</p>
  <form className="person-search" action="/admin/people" role="search">
   <label className="field">Find someone<input className="field__control" type="search" name="q" defaultValue={query} minLength={3} maxLength={254} required autoComplete="off" spellCheck={false} placeholder="Email, name or account ID"/></label>
   <button className="button button--secondary">Search</button>
  </form>
  {!query?<EveryoneList client={account.client} filter={chosen} page={pageNumber}/>:<>
   <Link href="/admin/people" className="account-back">← Back to everyone</Link>
   {query.length<3?<Notice title="Type at least 3 characters" tone="warning">Part of an email or name works, for example &ldquo;tolu&rdquo;.</Notice>
   :result?.error?<Notice title="Search unavailable" tone="warning">Try again in a moment.</Notice>
   :!people.length?<EmptyState title={`No one matches “${query}”`} icon="people">Check the spelling, or try part of the email before the @.</EmptyState>
   :<>{people.length>1&&<p className="caption muted">{people.length} matches, best match first{people.length===5?'. Showing the first 5; type more to narrow it down':''}.</p>}{people.map(p=><PersonCard key={p.id} p={p}/>)}</>}
  </>}
 </div>;
}
