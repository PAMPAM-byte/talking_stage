import type { Metadata } from 'next';

// Complete search and share metadata for a public page: its own title, description,
// canonical address and Open Graph/X card. Setting openGraph on a page replaces the
// inherited share image, so the card from app/opengraph-image.jpg is named here.
const image = { url: '/opengraph-image.jpg', width: 1200, height: 630, type: 'image/jpeg', alt: 'TalkingStage: a little banter, a little chemistry. Two smiling fictional AI characters.' };
export function pageMetadata({ path, title, description, absoluteTitle = false }: { path: string; title: string; description: string; absoluteTitle?: boolean }): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} · TalkingStage`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', siteName: 'TalkingStage', locale: 'en_NG', url: path, title: fullTitle, description, images: [image] },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images: [image] },
  };
}
