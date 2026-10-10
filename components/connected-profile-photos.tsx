"use client";
import { useEffect, useState } from 'react';
import { ReportControl } from './connected-reporting';
import { ProfilePhotoOpen, FullProfilePhoto } from './profile-photo-viewer';
import { Overlay } from './ui/overlay';
import { Button } from './ui/primitives';
type Asset = { id: string; slot: string; alt_text: string };
export function ConnectedProfilePhotos({ name, assets }: { name: string; assets: Asset[] }) {
  const photos = assets.filter(asset => ['portrait', 'gallery'].includes(asset.slot)).sort((a, b) => a.slot === b.slot ? 0 : a.slot === 'portrait' ? -1 : 1);
  const [index, setIndex] = useState<number | null>(null);
  const selected = index === null ? undefined : photos[index];
  const navigate = (direction: number) => setIndex(value => value === null ? null : (value + direction + photos.length) % photos.length);
  useEffect(() => {
    if (index === null || photos.length < 2) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); setIndex(value => value === null ? null : (value + (event.key === 'ArrowLeft' ? -1 : 1) + photos.length) % photos.length); }
    };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, [index, photos.length]);
  return <><div className="character-grid">{photos.map((asset, photoIndex) => <div key={asset.id} className="stack">
    <ProfilePhotoOpen src={'/api/cast-assets/' + asset.id + '?w=640'} srcSet={[320, 640, 1280].map(width => '/api/cast-assets/' + asset.id + '?w=' + width + ' ' + width + 'w').join(', ')} sizes="(min-width:900px) 33vw, 100vw" alt={asset.alt_text} label={'photo ' + (photoIndex + 1) + ' of ' + name} onOpen={() => setIndex(photoIndex)} />
    <ReportControl target={{ kind: 'photo', id: asset.id }} label={name + '’s ' + asset.slot + ' photo'} buttonLabel="Report photo" preview={asset.alt_text} />
  </div>)}</div>{selected && <Overlay open className="overlay--profile-photo" onClose={() => setIndex(null)} title={name + '’s photos'} description="AI-generated photos of a fictional adult character.">
    <FullProfilePhoto key={selected.id} src={'/api/cast-assets/' + selected.id + '?w=1280'} alt={selected.alt_text} />
    <div className="gallery-viewer-controls"><Button variant="secondary" aria-label="Previous photo" disabled={photos.length < 2} onClick={() => navigate(-1)}>←</Button><span className="caption muted" role="status">Photo {index! + 1} of {photos.length}</span><Button variant="secondary" aria-label="Next photo" disabled={photos.length < 2} onClick={() => navigate(1)}>→</Button></div>
  </Overlay>}</>;
}
