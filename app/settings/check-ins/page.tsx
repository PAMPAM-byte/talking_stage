import {ConnectedCheckins} from '@/components/connected-checkins';
import {usesSupabase} from '@/lib/backend/config';
import Link from 'next/link';
export const instant=false;
export default function Page(){return usesSupabase()?<ConnectedCheckins/>:<section className="space-page stack"><Link href="/settings">Back to settings</Link><h1>Character check-ins</h1><p>Preview mode. Check-ins become available with a connected account.</p></section>;}
