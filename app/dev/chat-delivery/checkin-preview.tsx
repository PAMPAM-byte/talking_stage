'use client';
import {useRef,useState} from 'react';
import {CheckinPreferences,type CheckinFrequency} from '@/components/checkin-preferences';
export function CheckinPreview(){const [frequency,setFrequency]=useState<CheckinFrequency>('off');const fail=useRef(false);return <main className="container space-page stack"><h1>Character check-ins · preview</h1><CheckinPreferences frequency={frequency} action={async(value,zone)=>{if(!zone)return {error:'Timezone missing.'};if(fail.current){fail.current=false;return {error:'Synthetic save unavailable.'};}setFrequency(value);return {};}}/><button type="button" onClick={()=>{fail.current=true;}}>Fail next preference save</button></main>;}
