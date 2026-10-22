const checking=new Set();
const prefix='talkingstage-checkin-check';
const optionalStorage=()=>{try{return globalThis.sessionStorage;}catch{return null;}};
export async function checkForInitiative(conversation,{fetcher=fetch,storage=optionalStorage(),now=Date.now}={}){
 const key=`${prefix}${conversation?`:${conversation}`:''}`;
 try{if(now()-Number(storage.getItem(key))<300000)return;}catch{/* Private browsing can disable storage. */}
 if(checking.has(key))return;checking.add(key);
 try{
  const response=await fetcher('/api/check-ins',{method:'POST',credentials:'same-origin',cache:'no-store',...(conversation?{headers:{'X-TalkingStage-Conversation':conversation}}:{})});
  if(response.ok&&(await response.json()).state==='scheduled')try{storage.setItem(key,String(now()));}catch{/* Database caps remain authoritative. */}
 }catch{/* Background recovery stays quiet. */}finally{checking.delete(key);}
}
export function clearInitiativeThrottle(storage=optionalStorage()){try{for(let index=storage.length-1;index>=0;index--){const key=storage.key(index);if(key?.startsWith(prefix))storage.removeItem(key);}}catch{/* Optional browser storage. */}}
