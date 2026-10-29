import type { MetadataRoute } from 'next';

// Lets phones add TalkingStage to the home screen as its own app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TalkingStage',
    short_name: 'TalkingStage',
    description: 'A little banter. A little chemistry. Chat with fictional Nigerian AI characters.',
    start_url: '/discover',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
