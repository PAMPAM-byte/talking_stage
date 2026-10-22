import {after} from 'next/server';
import {currentAccount} from '@/lib/backend/server';
import {isFirstPartyOrigin} from '@/lib/backend/request-origin.mjs';
import {processCheckin} from '@/lib/backend/checkin-worker';
export const maxDuration=60;
export async function POST(request:Request){
 if(!isFirstPartyOrigin(request))return Response.json({state:'forbidden'},{status:403});
 try{const account=await currentAccount({failOnUnavailable:true});if(!account)return Response.json({state:'unauthorized'},{status:401});if(!account.profile.onboarding_complete||!account.profile.adult_declared_at)return Response.json({state:'forbidden'},{status:403});
 const pref=await account.client.rpc('checkin_settings');if(pref.error)return Response.json({state:'unavailable'},{status:503});
 const body=await request.json().catch(()=>({}));const conversation=body?.conversation;
 if(conversation!==undefined&&(typeof conversation!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(conversation)))return Response.json({state:'invalid'},{status:400});
 if(pref.data.frequency!=='off')after(async()=>{await processCheckin(account.user.id,conversation);});
 return Response.json({state:pref.data.frequency==='off'?'disabled':'scheduled'},{status:202,headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({state:'unavailable'},{status:503});}
}
