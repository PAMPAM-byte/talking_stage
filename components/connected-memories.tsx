import Link from 'next/link';
import {currentAccount} from '@/lib/backend/server';
import {EmptyState,Notice} from './ui/primitives';
import {MemoryForm} from './connected-memory-form';
export async function ConnectedMemories({characterId,conversation}:{characterId?:string;conversation?:string}) {
 const account=await currentAccount();if(!account)return null;
 const listing=await account.client.rpc('memory_characters');
 if(listing.error)return <Notice title="Memories unavailable">Reload to try again.</Notice>;
 const characters=listing.data as {id:string;name:string}[];
 if(!characterId)return <section className="space-page stack"><Link className="profile-back" href="/settings">Back to settings</Link><h1 className="display page-title">Saved memories</h1><p className="muted">Choose what each character remembers. Memory starts off and only uses facts you explicitly save.</p>{characters.length?<div className="message-list__rows">{characters.map(c=><Link key={c.id} className="conversation-row conversation-row__link" href={`/settings/memories/${c.id}`}>Memories with {c.name}</Link>)}</div>:<EmptyState title="No memories yet" action={<Link href="/discover">Explore characters</Link>}>Start a conversation to manage memory with that character.</EmptyState>}</section>;
 const character=characters.find(c=>c.id===characterId);
 if(!character)return <EmptyState title="Memory unavailable" action={<Link href="/settings/memories">Back to saved memories</Link>}>Choose a character you have chatted with.</EmptyState>;
 const ownedThreads=()=>account.client.from('conversations').select('id').eq('character_id',characterId).eq('user_id',account.user.id).is('deleted_at',null);
 let returnThread=conversation&&/^[a-f0-9-]{36}$/i.test(conversation)?await ownedThreads().eq('id',conversation).maybeSingle():null;
 // Direct Settings visits and older links have no return parameter. Resolve
 // the same user's current chat instead of sending them through Settings.
 if(!returnThread?.data&&!returnThread?.error)returnThread=await ownedThreads().order('status',{ascending:true}).order('updated_at',{ascending:false}).order('id').limit(1).maybeSingle();
 if(returnThread?.error)return <Notice title="Conversation link unavailable">Please try again shortly. <Link href="/messages">Back to messages</Link></Notice>;
 const returnConversation=returnThread?.data?.id as string|undefined;
 const [facts,preference]=await Promise.all([account.client.from('memories').select('id,content,consent').eq('character_id',characterId).order('saved_at',{ascending:false}).limit(50),account.client.from('memory_preferences').select('enabled').eq('character_id',characterId).maybeSingle()]);
 if(facts.error||preference.error)return <Notice title="Memories unavailable">Reload to try again.</Notice>;
 // On unless the user turned it off (founder decision, 3 November).
 const enabled=preference.data?.enabled!==false;
 return <section className="message-list stack"><Link href={returnConversation?`/messages/${returnConversation}`:'/messages'}>{returnConversation?`Back to ${character.name}'s chat`:'Back to messages'}</Link><h1 className="display page-title">Memories with {character.name}</h1><Notice title={enabled?'Memory is on':'Memory is off'}>{enabled?`${character.name} notes facts you share about yourself, like your name, city or job, and remembers them in future chats. Delete anything you don’t want kept.`:`${character.name} won’t note anything new, and the facts below are left out of future chats.`}</Notice><MemoryForm character={characterId} operation={enabled?'disable':'enable'} label={enabled?'Turn memory off':'Turn memory on'}/>
 {enabled&&<div className="card stack"><h2>Save a memory</h2><MemoryForm character={characterId} operation="save" label="Save memory" conversation={returnConversation}/></div>}
 <h2>What {character.name} remembers</h2>{facts.data.length?facts.data.map(fact=><article key={fact.id} className="card stack"><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{fact.content}</p><p className="caption muted">{fact.consent==='explicit'?'Saved by you':'Noted from your chat'}</p><MemoryForm character={characterId} operation="delete" memory={fact.id} label="Delete memory"/></article>):<p className="muted">Nothing yet. Facts you share in chat will appear here.</p>}<p className="supporting muted">Deleting a fact removes it from future AI context. Messages already in your conversation remain; reset or delete that conversation to remove them.</p></section>;
}
