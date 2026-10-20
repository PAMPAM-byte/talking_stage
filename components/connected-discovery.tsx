import { ConnectedDiscoveryFilters } from './discovery-filter-controls';
import Link from 'next/link';
import {ConnectedProfilePhotos} from './connected-profile-photos';
import {ReportControl} from './connected-reporting';
import { characterHref } from '@/lib/discovery-navigation';
import { CharacterInterests } from './character-interests';
import { currentAccount } from '@/lib/backend/server';
import { EmptyState, Notice } from './ui/primitives';
import { ConnectedDiscoveryDeck } from './connected-discovery-deck';
import { loadDiscoveryFeed } from '@/lib/discovery-feed';
import {ConversationControl} from './connected-conversation-forms';
import {configuredReplyModel} from '@/lib/backend/reply-worker';
type Filters={gender?:string;interest?:string;personality?:string;page?:string};
type CastRow = { id:string;name:string;age:number;gender:string;bio:string;conversation_clue:string;fictional_location:string;occupation:string;interests:string[];personality:string[] };
async function eligibleCast(id?: string,filters:Filters={}) {
 const account=await currentAccount(); if(!account) return null;
 const preferred=account.profile.genders;
 const gender=filters.gender===undefined?(preferred.length===1?preferred[0]:'all'):(['man','woman'].includes(filters.gender)?filters.gender:'all');
 const effectiveFilters={gender,interest:filters.interest,personality:filters.personality};
 let characters: CastRow[];
 let collection: {page:number;total:number;interests:string[];personalities:string[]};
 if(id) {
   const result=await account.client.from('characters').select('id,name,age,gender,bio,conversation_clue,fictional_location,occupation,interests,personality').eq('id',id);
   if(result.error) return null;
   characters=result.data;
   collection={page:1,total:characters.length,interests:[],personalities:[]};
 } else {
   try {
     const feed=await loadDiscoveryFeed<CastRow>(page=>account.client.rpc('discover_cast',{p_page:page,p_gender:gender==='all'?null:gender,p_interest:filters.interest||null,p_personality:filters.personality||null}));
     characters=feed.characters; collection=feed;
   } catch { return null; }
 }
 if(!characters.length) return {account,characters,assets:[] as {id:string;character_id:string;slot:string;alt_text:string}[],collection,filters:effectiveFilters};
 const assets=await account.client.from('character_assets').select('id,character_id,slot,alt_text').in('character_id',characters.map(c=>c.id));
 if(assets.error) return null;
 return {account,characters,assets:assets.data??[],collection,filters:effectiveFilters};
}
export async function ConnectedDiscovery({ filters:requestedFilters }: {filters:Filters}) {
 const data=await eligibleCast(undefined,requestedFilters);
 if(!data) return <Notice title="Discovery unavailable" tone="warning">Reload to try again.</Notice>;
 const rows=data.characters;
 const filters=data.filters;
 const genderHref=(gender:string)=>{if(gender==='all')return '/discover?gender=all';const query=new URLSearchParams({gender});for(const key of ['interest','personality'] as const)if(filters[key])query.set(key,filters[key]!);return `/discover?${query}`;};
 return <div className="discovery-page discovery-page--swipe stack"><header className="discovery-heading"><div className="stack"><p className="supporting muted">Welcome, {data.account.profile.display_name}.</p><h1 className="display discovery-title">Find your spark.</h1><p className="muted">Find someone who catches your attention.</p></div></header>
 <nav className="row" aria-label="Character gender">{[['all','Everyone'],['woman','Women'],['man','Men']].map(([gender,label])=><Link key={gender} className="chip" href={genderHref(gender)} aria-current={filters.gender===gender?'page':undefined}>{label}</Link>)}</nav>
 <ConnectedDiscoveryFilters filters={filters} interests={data.collection.interests} personalities={data.collection.personalities} />
 {rows.length ? <ConnectedDiscoveryDeck key={JSON.stringify(filters)} scope={`${data.account.profile.id}:${JSON.stringify(filters)}`} cards={rows.map(c => {
   const photo = data.assets.find(a => a.character_id === c.id && a.slot === 'portrait');
   return { id: c.id, name: c.name, age: c.age, location: c.fictional_location, occupation: c.occupation, clue: c.conversation_clue, bio: c.bio, interests: c.interests, href: characterHref(c.id, filters), photo: photo ?
     // eslint-disable-next-line @next/next/no-img-element
     <img src={`/api/cast-assets/${photo.id}?w=640`} srcSet={[320,640,1280].map(w => `/api/cast-assets/${photo.id}?w=${w} ${w}w`).join(', ')} sizes="(min-width:900px) 420px, (min-width:600px) 440px, 100vw" alt={photo.alt_text} loading="eager" draggable={false} className="connected-cast-photo" /> : <span className="photo-paused">Photos are paused</span> };
 })} /> : <EmptyState title="No characters to show" action={<Link href="/discover?gender=all">Reset filters</Link>}>Try another filter, or return when more reviewed characters are available.</EmptyState>}
 </div>;
}
export async function ConnectedCharacter({id,backHref='/discover'}:{id:string;backHref?:string}) {
 if(!/^[a-f0-9-]{36}$/i.test(id)) return <EmptyState title="Character unavailable">This character is not available. Return to discovery.</EmptyState>;
 const data=await eligibleCast(id);const c=data?.characters[0];
 if(!data||!c) return <EmptyState title="Character unavailable" action={<Link href={backHref}>Back to discovery</Link>}>This character is not available right now.</EmptyState>;
 const capabilities=await data.account.client.rpc('effective_capabilities',{p_character:c.id});
 const model=configuredReplyModel();const replies=!!model&&(await data.account.client.rpc('reply_availability',{p_model:model})).data===true;
 const conversationAction=capabilities.data?.chat===true?<ConversationControl id={c.id} operation="start" label="Start conversation"/>:<Notice title="Chat is paused">You can still explore this character’s profile.</Notice>;
 return <div className="profile-page stack"><Link className="profile-back" href={backHref}>Back to discovery</Link><div className="profile-layout"><section className="profile-gallery stack" aria-label={`${c.name}'s photos`}><ConnectedProfilePhotos name={c.name} assets={data.assets}/></section><section className="profile-details stack"><div><p className="profile-eyebrow">A little introduction</p><h1 className="display profile-title">{c.name}, {c.age}</h1><div className="profile-facts"><span>{c.occupation}</span><span>{c.fictional_location}</span></div></div><blockquote className="conversation-clue profile-clue"><span className="caption">One thing about me</span><p>&ldquo;{c.conversation_clue}&rdquo;</p></blockquote><div className="profile-section stack"><h2>A little about me</h2><p>{c.bio}</p></div><div className="profile-section stack"><CharacterInterests interests={c.interests} /></div><div className="profile-conversation-action">{conversationAction}</div>{!replies&&<Notice title="Replies are not available yet">You can save messages while we prepare AI replies.</Notice>}<ReportControl target={{kind:"character",id:c.id}} label={`${c.name}'s profile`} buttonLabel="Report character" preview={`${c.name}, ${c.age} - ${c.bio}`}/></section></div></div>;
}
