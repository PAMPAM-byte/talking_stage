import {networkInterfaces} from 'node:os';

// Production mutations retain the configured origin. LAN origins are development-only.
export function isFirstPartyOrigin(request,env=process.env){
 try{
  const origin=new URL(request.headers.get('origin'));
  if(env.TALKINGSTAGE_SITE_URL&&origin.origin===new URL(env.TALKINGSTAGE_SITE_URL).origin)return true;
  if(env.NODE_ENV!=='development'||!['http:','https:'].includes(origin.protocol))return false;
  const hosts=['localhost','127.0.0.1',...Object.values(networkInterfaces()).flatMap(entries=>(entries??[]).filter(entry=>entry.family==='IPv4').map(entry=>entry.address))];
  return origin.host===request.headers.get('host')&&hosts.includes(origin.hostname);
 }catch{return false;}
}
