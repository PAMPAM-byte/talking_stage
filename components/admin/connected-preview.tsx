import Link from 'next/link';
import {currentAccount} from '@/lib/backend/server';
import type {CastProfile} from '@/lib/backend/cast-types';
import {Badge,EmptyState,Notice} from '@/components/ui/primitives';
export async function ConnectedPreview({id}:{id:string}) {
 const account=await currentAccount();if(!account)return null;
 if(!/^[a-f0-9-]{36}$/i.test(id))return <Notice title="Preview unavailable"/>;
 const result=await account.client.rpc('admin_cast_preview',{p_id:id});
 if(result.error)return <Notice title="Preview unavailable" tone="warning">Return to the character and try again.</Notice>;
 if(!result.data)return <EmptyState title="Character unavailable">This draft could not be found.</EmptyState>;
 const {profile:p,assets}=result.data as {profile:CastProfile;assets:{id:string;slot:string;alt_text:string}[]};
 return <div className="stack"><Link href={`/admin/characters/${id}`}>Back to character</Link><Notice title="Public profile preview">This is the saved draft. Previewing does not publish it. Only approved portrait and gallery photos appear here.</Notice>
 <h1 className="display page-title">{p.name}, {p.age}</h1><Badge>Fictional adult AI character</Badge><p className="muted">{p.fictionalLocation} · {p.occupation}</p>
 {assets.length?<div className="character-grid">{assets.map(a=>
 // eslint-disable-next-line @next/next/no-img-element
 <img key={a.id} className="cast-review-photo" src={`/api/cast-assets/${a.id}?w=640`} alt={a.alt_text}/>)}</div>:<Notice title="Approved photos needed">Upload and review this character’s photos before publication.</Notice>}
 <p>{p.bio}</p><blockquote className="conversation-clue">{p.conversationClue}</blockquote><div className="row">{p.interests.map(i=><Badge key={i}>{i}</Badge>)}</div><p className="caption muted">This character is AI. Images depict a fictional adult.</p></div>;
}
