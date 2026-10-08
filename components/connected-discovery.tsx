import Link from 'next/link';
import { currentAccount } from '@/lib/backend/server';
import { Badge, EmptyState, Notice } from './ui/primitives';
import {Pagination} from './ui/pagination';
import {ConversationControl} from './connected-conversation-forms';
import {configuredReplyModel} from '@/lib/backend/reply-worker';
type Filters={gender?:string;interest?:string;personality?:string;page?:string};
type CastRow = { id:string;name:string;age:number;gender:string;bio:string;conversation_clue:string;fictional_location:string;occupation:string;interests:string[];personality:string[] };
async function eligibleCast(id?: string,filters:Filters={}) {
 const account=await currentAccount(); if(!account) return null;
 const result=id?await account.client.from('characters').select('id,name,age,gender,bio,conversation_clue,fictional_location,occupation,interests,personality').eq('id',id):await account.client.rpc('discover_cast',{p_page:Number(filters.page??1),p_gender:filters.gender||null,p_interest:filters.interest||null,p_personality:filters.personality||null});
 if(result.error) return null;
 const characters=(id?result.data:result.data.characters) as CastRow[];
 const collection=id?{page:1,total:characters.length,interests:[] as string[],personalities:[] as string[]}:result.data as {page:number;total:number;interests:string[];personalities:string[]};
 if(!characters.length) return {account,characters,assets:[] as {id:string;character_id:string;slot:string;alt_text:string}[],collection};
 const assets=await account.client.from('character_assets').select('id,character_id,slot,alt_text').in('character_id',characters.map(c=>c.id));
 if(assets.error) return null;
 return {account,characters,assets:assets.data??[],collection};
}
export async function ConnectedDiscovery({ filters }: {filters:Filters}) {
 const data=await eligibleCast(undefined,filters);
 if(!data) return <Notice title="Discovery unavailable" tone="warning">Reload to try again.</Notice>;
 const rows=data.characters;
 const pageHref=(page:number)=>{const query=new URLSearchParams();for(const key of ['gender','interest','personality'] as const)if(filters[key])query.set(key,filters[key]!);query.set('page',String(page));return `/discover?${query}`;};
 return <div className="discovery-page stack"><header className="discovery-heading"><div className="stack"><p className="supporting muted">Welcome, {data.account.profile.display_name}.</p><h1 className="display discovery-title">A little spark.<br/>A good conversation.</h1><p className="muted">Meet fictional AI characters with a personality of their own.</p></div><div className="discovery-disclosure">Every character is AI.<br/>Every story is fictional.</div></header>
 <form className="row" action="/discover"><label className="field">Gender<select className="field__control" name="gender" defaultValue={filters.gender??''}><option value="">Everyone</option><option value="woman">Women</option><option value="man">Men</option></select></label><label className="field">Interest<select className="field__control" name="interest" defaultValue={filters.interest??''}><option value="">Any interest</option>{data.collection.interests.map(i=><option key={i}>{i}</option>)}</select></label><label className="field">Personality<select className="field__control" name="personality" defaultValue={filters.personality??''}><option value="">Any personality</option>{data.collection.personalities.map(i=><option key={i}>{i}</option>)}</select></label><button className="button button--secondary">Apply filters</button><Link href="/discover">Reset filters</Link></form>
 <p role="status" className="caption muted">{data.collection.total} characters to discover</p>
 {rows.length?<div className="character-grid">{rows.map(c=>{const photo=data.assets.find(a=>a.character_id===c.id&&a.slot==='portrait');return <article key={c.id} className="character-card"><Link href={`/characters/${c.id}`} className="character-photo">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 {photo?<img src={`/api/cast-assets/${photo.id}?w=640`} srcSet={[320,640,1280].map(w=>`/api/cast-assets/${photo.id}?w=${w} ${w}w`).join(', ')} sizes="(min-width:900px) 33vw, (min-width:600px) 50vw, 100vw" alt={photo.alt_text} loading="lazy" className="connected-cast-photo" />:<span className="photo-paused">Photos are paused</span>}</Link><div className="character-card__body stack"><Badge>Fictional AI character</Badge><h2>{c.name}, {c.age}</h2><p className="muted">{c.fictional_location} · {c.occupation}</p><blockquote className="conversation-clue">{c.conversation_clue}</blockquote><Link className="button button--secondary" href={`/characters/${c.id}`}>Meet {c.name}</Link></div></article>;})}</div>:<EmptyState title="No characters to show" action={<Link href="/discover">Reset filters</Link>}>Try another filter, or return when more reviewed characters are available.</EmptyState>}
 <Pagination page={data.collection.page} total={data.collection.total} href={pageHref}/>
 </div>;
}
export async function ConnectedCharacter({id}:{id:string}) {
 if(!/^[a-f0-9-]{36}$/i.test(id)) return <EmptyState title="Character unavailable">This character is not available. Return to discovery.</EmptyState>;
 const data=await eligibleCast(id);const c=data?.characters[0];
 if(!data||!c) return <EmptyState title="Character unavailable" action={<Link href="/discover">Back to discovery</Link>}>This character is not available right now.</EmptyState>;
 const capabilities=await data.account.client.rpc('effective_capabilities',{p_character:c.id});
 const model=configuredReplyModel();const replies=!!model&&(await data.account.client.rpc('reply_availability',{p_model:model})).data===true;
 const conversationAction=capabilities.data?.chat===true?<ConversationControl id={c.id} operation="start" label="Start conversation"/>:<Notice title="Chat is paused">You can still explore this character’s profile.</Notice>;
 return <div className="stack"><Link href="/discover">Back to discovery</Link><h1 className="display page-title">{c.name}, {c.age}</h1><Badge>Fictional adult AI character</Badge><p className="muted">{c.fictional_location} · {c.occupation}</p><div className="character-grid">{data.assets.filter(a=>['portrait','gallery'].includes(a.slot)).map(a=>
 // eslint-disable-next-line @next/next/no-img-element
 <img key={a.id} className="cast-review-photo" src={`/api/cast-assets/${a.id}?w=640`} srcSet={[320,640,1280].map(w=>`/api/cast-assets/${a.id}?w=${w} ${w}w`).join(', ')} sizes="(min-width:900px) 33vw, 100vw" alt={a.alt_text} loading="lazy" />)}</div><p>{c.bio}</p><blockquote className="conversation-clue">{c.conversation_clue}</blockquote><div className="row">{c.interests.map(i=><Badge key={i}>{i}</Badge>)}</div>{conversationAction}{!replies&&<Notice title="Replies are not available yet">You can save messages while we prepare AI replies.</Notice>}</div>;
}
