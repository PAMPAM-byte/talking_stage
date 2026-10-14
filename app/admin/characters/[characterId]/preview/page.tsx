import { LoadingState } from '@/components/loading-state';
import {Suspense} from 'react';
import {ConnectedPreview} from '@/components/admin/connected-preview';
export const instant=false;
export const metadata={title:'Public profile preview',robots:{index:false,follow:false}};
async function Preview({params}:{params:Promise<{characterId:string}>}) {return <ConnectedPreview id={(await params).characterId}/>;}
export default function Page({params}:{params:Promise<{characterId:string}>}) {return <Suspense fallback={<LoadingState label="Loading profile preview…" />}><Preview params={params}/></Suspense>;}
