import type { MetadataRoute } from 'next';

// Link-preview bots (X, WhatsApp, Facebook, LinkedIn, Telegram) read the public pages and the share card.
export default function robots(): MetadataRoute.Robots {
  return { sitemap: 'https://www.talkingstage.buzz/sitemap.xml', host: 'https://www.talkingstage.buzz', rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/dev/', '/discover', '/messages', '/characters', '/settings', '/gifts', '/payments', '/onboarding', '/auth/'] } };
}
