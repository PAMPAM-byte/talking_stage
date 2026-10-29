export const instant = false;
import { redirect } from 'next/navigation';
import { AdminScreen } from '@talkingstage/admin-ui';
import { usesSupabase } from '@/lib/backend/config';
// Live analytics are not built (F19); AI spend lives on Operations.
export default function Page() { if (usesSupabase()) redirect('/admin/operations'); return <AdminScreen section="analytics" />; }
