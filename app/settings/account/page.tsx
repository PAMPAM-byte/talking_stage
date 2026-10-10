export const instant = false;
import { AccountDeletion } from '@/components/personal-space';
import { usesSupabase } from '@/lib/backend/config';
import { ConnectedAccountDeletion } from '@/components/connected-account-deletion';
import { currentAccount } from '@/lib/backend/server';
export default async function Page() {
 if(!usesSupabase())return <AccountDeletion />;
 const account=await currentAccount();if(!account)return null;
 const available=await account.client.rpc('account_deletion_status');
 return <ConnectedAccountDeletion enabled={!available.error&&available.data===true} />;
}
