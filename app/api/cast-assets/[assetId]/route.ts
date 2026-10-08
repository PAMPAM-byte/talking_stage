import { currentAccount } from '@/lib/backend/server';
import { castBucket, trustedStorage } from '@/lib/backend/storage';
export async function GET(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const deny = (status: number) => new Response(null, { status, headers: { 'Cache-Control': 'private, no-store' } });
  try {
    const { assetId } = await params;
    if (!/^[a-f0-9-]{36}$/i.test(assetId)) return deny(404);
    const account = await currentAccount();
    if (!account) return deny(401);
    if (!account.profile.onboarding_complete || !account.profile.adult_declared_at) return deny(403);
    const role = await account.client.rpc('is_admin');
    let path: string | undefined;
    if (role.data === true) {
      const listed = await account.client.rpc('admin_list_assets', { p_character: null });
      path = listed.data?.find((item: { id: string }) => item.id === assetId)?.storage_path;
    } else {
      const eligible = await account.client.from('character_assets').select('storage_path,character_id').eq('id', assetId).single();
      if(eligible.data) {
        const capabilities=await account.client.rpc('effective_capabilities',{p_character:eligible.data.character_id});
        if(capabilities.error)return deny(503);
        if(capabilities.data?.photos!==true)return deny(403);
      }
      path = eligible.data?.storage_path;
    }
    if (!path) return deny(404);
    const requested = new URL(request.url).searchParams.get('w');
    const width = ['320','640','1280'].includes(requested ?? '') ? requested : '640';
    const object = await trustedStorage().storage.from(castBucket).download(path.replace(/original\.webp$/, `${width}.webp`));
    if (object.error || !object.data) return deny(503);
    return new Response(object.data, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Cookie' } });
  } catch { return deny(503); }
}
