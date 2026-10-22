'use client';
import {useEffect} from 'react';
export function CheckinSync({conversation}:{conversation?:string}){useEffect(()=>{const key=`talkingstage-checkin-check${conversation?`:${conversation}`:''}`;try{const previous=Number(sessionStorage.getItem(key));if(Date.now()-previous<300000)return;sessionStorage.setItem(key,String(Date.now()));}catch{/* Server eligibility remains authoritative. */}void fetch('/api/check-ins',{method:'POST',credentials:'same-origin',cache:'no-store'}).catch(()=>{});},[conversation]);return null;}
