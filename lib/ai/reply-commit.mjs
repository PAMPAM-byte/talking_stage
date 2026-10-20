// Completion RPCs are idempotent for a claimed job/lease. Retry only the save,
// never claim again or call the model again after a lost completion response.
function transient(result){
 const code=result?.error?.code;
 if(code&&/^(?:[0-9A-Z]{5}|PGRST\d+)$/.test(code)&&!['08000','08003','08006','08001','08004','53300','57P01','57014','PGRST000','PGRST001','PGRST002','PGRST003'].includes(code))return false;
 return result?.status===0||[408,429,500,502,503,504].includes(result?.status)
  ||['TimeoutError','AbortError','TypeError'].includes(result?.error?.name)
  ||/fetch failed|failed to fetch|networkerror|network request failed|timeout|timed out/i.test(result?.error?.message??'');
}
export async function commitReply(client,name,args,{pause=()=>new Promise(resolve=>setTimeout(resolve,150)),onAttempt}={}){
 for(let attempt=0;attempt<2;attempt++){
  const started=performance.now();let result;
  try{result=await client.rpc(name,args);}catch(error){result={error};}
  try{onAttempt?.(result?.error?(transient(result)?'unavailable':'rejected'):result?.data==='completed'?'ok':'rejected',performance.now()-started);}catch{/* Telemetry cannot interrupt a committed reply. */}
  if(!result?.error||!transient(result)||attempt===1)return result;
  await pause();
 }
}
