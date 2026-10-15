import {notFound} from 'next/navigation';
import DeliveryPreview from './preview';
export default function Page(){
 if(process.env.NODE_ENV!=='development'||process.env.TALKINGSTAGE_PREVIEW_TEST!=='1')notFound();
 return <DeliveryPreview/>;
}
