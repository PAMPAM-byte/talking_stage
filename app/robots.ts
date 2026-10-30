import type { MetadataRoute } from 'next';

// Link-preview bots (X, WhatsApp, Facebook, LinkedIn, Telegram) read the public pages and the share card.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/dev/'] } };
}
