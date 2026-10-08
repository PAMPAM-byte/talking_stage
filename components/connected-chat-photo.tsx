"use client";
import {useState} from 'react';
import {Button} from './ui/primitives';
import {Overlay} from './ui/overlay';
export function ConnectedChatPhoto({assetId,name,description}:{assetId:string;name:string;description?:string}) {
 const [open,setOpen]=useState(false);const [failed,setFailed]=useState(false);const [attempt,setAttempt]=useState(0);
 const alt=description||`AI-generated photo of ${name}, a fictional adult character`;
 const reload=()=>{setAttempt(value=>value+1);setFailed(false);};
 return <><figure className="chat-photo"><div className="chat-photo__image">{failed?<div className="photo-failure"><p>Photo is unavailable.</p><p className="caption muted">Photos may be paused or this photo may have been withdrawn.</p><Button variant="secondary" onClick={reload}>Reload photo</Button></div>:<button type="button" aria-label={`View ${name}’s character photo`} onClick={()=>setOpen(true)}>
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img key={attempt} ref={image=>{if(image?.complete&&image.naturalWidth===0){setFailed(true);setOpen(false);}}} src={`/api/cast-assets/${assetId}?w=640&attempt=${attempt}`} alt={alt} width={640} height={854} loading="lazy" onError={()=>{setFailed(true);setOpen(false);}}/></button>}</div><figcaption><strong>AI-generated character photo</strong><span>Fictional adult character</span></figcaption></figure>
 <Overlay open={open} onClose={()=>setOpen(false)} title={`${name}’s character photo`} description="AI-generated photo of a fictional adult character.">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 {open&&<img className="connected-photo-viewer" src={`/api/cast-assets/${assetId}?w=1280&attempt=${attempt}`} alt={alt} onError={()=>{setFailed(true);setOpen(false);}}/>}</Overlay></>;
}
