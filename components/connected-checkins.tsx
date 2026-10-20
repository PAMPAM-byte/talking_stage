import Link from 'next/link';
import {currentAccount} from '@/lib/backend/server';
import {Notice} from './ui/primitives';
import {CheckinPreferences,type CheckinFrequency} from './checkin-preferences';
import {saveCheckinPreference} from '@/lib/backend/checkin-actions';
export async function ConnectedCheckins(){
 const account=await currentAccount();if(!account)return null;
 const result=await account.client.rpc('checkin_settings');
 if(result.error)return <Notice title="Check-in settings unavailable" tone="warning">Please try again.</Notice>;
 return <section className="space-page stack"><Link href="/settings">Back to settings</Link><h1 className="display page-title">Character check-ins</h1><p className="muted">A little hello, at your pace.</p><CheckinPreferences frequency={result.data.frequency as CheckinFrequency} action={saveCheckinPreference}/></section>;
}
