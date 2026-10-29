export const instant = false;
import { redirect } from 'next/navigation';
import { AdminScreen } from '@talkingstage/admin-ui';
import { usesSupabase } from '@/lib/backend/config';
// Role switching is a development preview; live access is the is_admin role.
export default function Page() { if (usesSupabase()) redirect('/admin/characters'); return <AdminScreen section="access" />; }
