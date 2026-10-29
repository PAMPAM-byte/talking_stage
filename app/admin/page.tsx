export const instant = false;
import { redirect } from 'next/navigation';
import { AdminScreen } from '@talkingstage/admin-ui';
import { usesSupabase } from '@/lib/backend/config';
// No live dashboard yet (K2): the cast list is the admin home.
export default function Page() { if (usesSupabase()) redirect('/admin/characters'); return <AdminScreen section="dashboard" />; }
