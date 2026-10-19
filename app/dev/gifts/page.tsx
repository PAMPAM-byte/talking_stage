import {notFound} from 'next/navigation';
import GiftPreview from '@talkingstage/gift-preview';
export const instant=false;
export default function Page(){
 if(process.env.NODE_ENV!=='development'||process.env.TALKINGSTAGE_PREVIEW_TEST!=='1')notFound();
 return <GiftPreview/>;
}
