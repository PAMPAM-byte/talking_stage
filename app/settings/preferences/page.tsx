export const instant = false;
import { Preferences } from '@/components/personal-space';
import { RealAccountForm } from '@/components/real-account-form';
import { currentAccount } from '@/lib/backend/server';
import { usesSupabase } from '@/lib/backend/config';
export default async function Page() {
  if (!usesSupabase()) return <Preferences />;
  const account = await currentAccount();
  return account ? <RealAccountForm step="preferences" profile={account.profile} configured settings /> : null;
}
