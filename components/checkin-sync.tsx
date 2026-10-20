'use client';
import {useEffect} from 'react';
export function CheckinSync(){useEffect(()=>{const key='talkingstage-checkin-check';try{const previous=Number(sessionStorage.getItem(key));if(Date.now()-previous<300000)return;sessionStorage.setItem(key,String(Date.now()));}catch{/* Server eligibility remains authoritative. */}void fetch('/api/check-ins',{method:'POST',credentials:'same-origin',cache:'no-store'}).catch(()=>{});},[]);return null;}
