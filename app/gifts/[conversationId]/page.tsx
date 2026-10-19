import {ProtectedArea} from '@/components/protected-area';
import {ConnectedGift} from '@/components/connected-payments';
export const instant=false;
export default async function Page({params}:{params:Promise<{conversationId:string}>}){
 const {conversationId}=await params;
 return <ProtectedArea area="Payments"><ConnectedGift conversation={conversationId}/></ProtectedArea>;
}
