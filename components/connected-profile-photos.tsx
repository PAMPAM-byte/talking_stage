"use client";
import { useEffect, useState } from 'react';
import { ReportControl } from './connected-reporting';
import { ProfilePhotoOpen, FullProfilePhoto } from './profile-photo-viewer';
import { Overlay } from './ui/overlay';
import { Button } from './ui/primitives';
type Asset = { id: string; slot: string; alt_text: string };
export function ConnectedProfilePhotos({ name, assets }: { name: string; assets: Asset[] }) {
  const photos = assets.filter(asset => ['portrait', 'gallery'].includes(asset.slot)).sort((a, b) => a.slot === b.slot ? 0 : a.slot === 'portrait' ? -1 : 1);
  const [index, setIndex] = useState(0);
  const [viewing, setViewing] = useState(false);
  const selected = photos[index] ?? photos[0];
  const navigate = (direction: number) => setIndex(value => (value + direction + photos.length) % photos.length);
  useEffect(() => {
    if (!viewing || photos.length < 2) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); setIndex(value => (value + (event.key === 'ArrowLeft' ? -1 : 1) + photos.length) % photos.length); }
    };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, [viewing, photos.length]);
  if (!selected) return <div className="profile-photo-unavailable">Character photos are unavailable.</div>;
  return <><div className="profile-gallery__main">
    <ProfilePhotoOpen key={selected.id} src={'/api/cast-assets/' + selected.id + '?w=640'} srcSet={[320, 640, 1280].map(width => '/api/cast-assets/' + selected.id + '?w=' + width + ' ' + width + 'w').join(', ')} sizes="(min-width:1200px) 430px, (min-width:900px) 40vw, (min-width:600px) 45vw, calc(100vw - 48px)" alt={selected.alt_text} label={'photo ' + (index + 1) + ' of ' + name} onOpen={() => setViewing(true)} />
    <Button className="gallery-expand" variant="secondary" onClick={() => setViewing(true)}>View photos · {index + 1}/{photos.length}</Button>
  </div><div className="gallery-thumbnails" aria-label="Choose photo">{photos.map((asset, photoIndex) => <button type="button" key={asset.id} aria-label={`Show photo ${photoIndex + 1} of ${name}`} aria-pressed={index === photoIndex} onClick={() => setIndex(photoIndex)}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={'/api/cast-assets/' + asset.id + '?w=320'} alt={`${name}, ${asset.slot} preview`} loading="lazy" />
  </button>)}</div><ReportControl target={{ kind: 'photo', id: selected.id }} label={name + '’s ' + selected.slot + ' photo'} buttonLabel="Report photo" preview={selected.alt_text} />{viewing && <Overlay open className="overlay--profile-photo" onClose={() => setViewing(false)} title={name + '’s photos'}>
    <FullProfilePhoto key={selected.id} src={'/api/cast-assets/' + selected.id + '?w=1280'} alt={selected.alt_text} />
    <div className="gallery-viewer-controls"><Button variant="secondary" aria-label="Previous photo" disabled={photos.length < 2} onClick={() => navigate(-1)}>←</Button><span className="caption muted" role="status">Photo {index! + 1} of {photos.length}</span><Button variant="secondary" aria-label="Next photo" disabled={photos.length < 2} onClick={() => navigate(1)}>→</Button></div>
  </Overlay>}</>;
}
