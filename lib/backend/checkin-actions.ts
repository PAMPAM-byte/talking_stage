'use server';
import {revalidatePath} from 'next/cache';
import {currentAccount} from './server';
import type {CheckinFrequency} from '@/components/checkin-preferences';
export async function saveCheckinPreference(frequency:CheckinFrequency,timeZone:string):Promise<{error?:string}>{
 if(!['off','daily','twice_weekly','on_return'].includes(frequency))return {error:'Choose a check-in preference.'};
 try{new Intl.DateTimeFormat('en',{timeZone}).format();}catch{return {error:'Your timezone could not be read. Try again.'};}
 try{const account=await currentAccount({failOnUnavailable:true});if(!account?.profile.adult_declared_at||!account.profile.onboarding_complete)return {error:'Sign in to update your preference.'};
 const result=await account.client.rpc('set_checkin_preference',{p_frequency:frequency,p_timezone:timeZone});if(result.error)return {error:'Your preference was not saved. Try again.'};
 try{revalidatePath('/settings/check-ins');}catch{/* Keep the committed preference. */}return {};
 }catch{return {error:'Your preference was not saved. Try again.'};}
}
