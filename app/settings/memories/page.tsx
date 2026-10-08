export const instant = false;
import { Memories } from '@/components/personal-space';
import {usesSupabase} from '@/lib/backend/config';
import {ConnectedMemories} from '@/components/connected-memories';
export default function Page() { return usesSupabase()?<ConnectedMemories/>:<Memories />; }
