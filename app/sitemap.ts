import type { MetadataRoute } from 'next';

// Public pages only; signed-in areas stay out of search.
const pages: [string, number][] = [['', 1], ['/how-it-works', 0.8], ['/personalities', 0.8], ['/faqs', 0.7], ['/support', 0.4], ['/payment-information', 0.3], ['/privacy', 0.3], ['/terms', 0.3]];
export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map(([path, priority]) => ({ url: `https://www.talkingstage.buzz${path}`, lastModified: new Date(), changeFrequency: 'weekly', priority }));
}
