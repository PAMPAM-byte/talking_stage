export const instant = false;
import { Settings } from '@/components/personal-space';
import { ConnectedSettings } from '@/components/connected-settings';
import { usesSupabase } from '@/lib/backend/config';
export default function Page() { return usesSupabase() ? <ConnectedSettings /> : <Settings />; }
