"use client";
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
// Keeps live admin figures current while the tab is open; paused in background tabs.
export function AutoRefresh({seconds=60}:{seconds?:number}){
 const router=useRouter();
 useEffect(()=>{const timer=setInterval(()=>{if(!document.hidden)router.refresh();},seconds*1000);return ()=>clearInterval(timer);},[router,seconds]);
 return null;
}
