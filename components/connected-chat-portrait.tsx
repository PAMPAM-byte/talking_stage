"use client";
import {useState} from 'react';

export function ConnectedChatPortrait({assetId,name}:{assetId?:string;name:string}) {
 const [failed,setFailed]=useState(false);
 return <span className="chat-avatar connected-chat-avatar">{assetId&&!failed?
 // Authenticated images must use the existing no-store proxy.
 // eslint-disable-next-line @next/next/no-img-element
 <img src={`/api/cast-assets/${assetId}?w=320`} alt={`${name}’s character portrait`} width={48} height={48} ref={image=>{if(image?.complete&&image.naturalWidth===0)setFailed(true);}} onError={()=>setFailed(true)}/>
 :<span role="img" aria-label={`${name}’s portrait is unavailable`}>{name.trim().slice(0,1).toUpperCase()}</span>}</span>;
}
