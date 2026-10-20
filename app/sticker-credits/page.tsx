import {PublicShell} from '@/components/shells';
import {stickerPhotoCredits} from '@/lib/chat/sticker-credits';
export const metadata = {title:'Sticker credits'};
export default function Page() {
  return <PublicShell><section className="space-page stack"><h1 className="display page-title">Sticker credits</h1><p>Our Naija pack mixes original reaction artwork with licensed Nollywood photographs.</p><p>The photographs are unchanged. TalkingStage adds the reaction captions and presentation. The captions are not quotations or endorsements by the people pictured.</p>{stickerPhotoCredits.map(photo=><article key={photo.id} className="stack"><h2>{photo.title}</h2><p>Photo by {photo.author}. <a href={photo.source}>Original photograph and attribution</a> · <a href={photo.licenseUrl}>{photo.license}</a> · <a href={photo.file}>Local original</a></p><p className="supporting muted">The photograph retains its stated licence. Any adaptation of a share-alike photograph is available under that same licence.</p></article>)}<p>All other reaction illustrations are TalkingStage originals.</p></section></PublicShell>;
}
