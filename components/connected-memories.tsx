import Link from 'next/link';
import {currentAccount} from '@/lib/backend/server';
import {EmptyState,Notice} from './ui/primitives';
import {MemoryForm} from './connected-memory-form';
export async function ConnectedMemories({characterId}:{characterId?:string}) {
 const account=await currentAccount();if(!account)return null;
 const listing=await account.client.rpc('memory_characters');
 if(listing.error)return <Notice title="Memories unavailable">Reload to try again.</Notice>;
 const characters=listing.data as {id:string;name:string}[];
 if(!characterId)return <section className="message-list stack"><h1 className="display page-title">Saved memories</h1><p className="muted">Choose what each character remembers. Memory starts off and only uses facts you explicitly save.</p>{characters.length?<div className="message-list__rows">{characters.map(c=><Link key={c.id} className="conversation-row conversation-row__link" href={`/settings/memories/${c.id}`}>Memories with {c.name}</Link>)}</div>:<EmptyState title="No memories yet" action={<Link href="/discover">Explore characters</Link>}>Start a conversation to manage memory with that character.</EmptyState>}</section>;
 const character=characters.find(c=>c.id===characterId);
 if(!character)return <EmptyState title="Memory unavailable" action={<Link href="/settings/memories">Back to saved memories</Link>}>Choose a character you have chatted with.</EmptyState>;
 const [facts,preference]=await Promise.all([account.client.from('memories').select('id,content,consent').eq('character_id',characterId).order('saved_at',{ascending:false}).limit(50),account.client.from('memory_preferences').select('enabled').eq('character_id',characterId).maybeSingle()]);
 if(facts.error||preference.error)return <Notice title="Memories unavailable">Reload to try again.</Notice>;
 const enabled=preference.data?.enabled===true;
 return <section className="message-list stack"><Link href="/settings/memories">Back to saved memories</Link><h1 className="display page-title">Memories with {character.name}</h1><Notice title={enabled?'Memory is on':'Memory is off'}>{enabled?'Only your explicitly saved facts can enter future chats.':'Saved facts stay here, but are excluded from future chats. Enable memory to save another fact.'}</Notice><MemoryForm character={characterId} operation={enabled?'disable':'enable'} label={enabled?'Turn memory off':'Turn memory on'}/>
 {enabled&&<div className="card stack"><h2>Save a memory</h2><MemoryForm character={characterId} operation="save" label="Save memory"/></div>}
 <h2>Saved facts</h2>{facts.data.length?facts.data.map(fact=><article key={fact.id} className="card stack"><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{fact.content}</p><p className="caption muted">Explicit permission · Saved by you</p><MemoryForm character={characterId} operation="delete" memory={fact.id} label="Delete memory"/></article>):<p className="muted">No saved facts for this character.</p>}<p className="supporting muted">Deleting a fact removes it from future AI context. Messages already in your conversation remain; reset or delete that conversation to remove them.</p></section>;
}
