"use client";
import {useEffect,useState} from 'react';
import {Notice} from './ui/primitives';

export function MemorySavedConfirmation(){
 const [visible,setVisible]=useState(true);
 useEffect(()=>{
  const url=new URL(window.location.href);
  if(url.searchParams.get('memory')==='saved'){
   url.searchParams.delete('memory');
   window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
  }
  const timer=setTimeout(()=>setVisible(false),5000);
  return()=>clearTimeout(timer);
 },[]);
 return visible?<Notice title="Memory saved" tone="success" live/>:null;
}
