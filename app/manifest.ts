import type { MetadataRoute } from 'next';

// Served at /manifest.webmanifest — makes the app installable on iOS/Android.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Menorah Global',
    short_name: 'Menorah',
    description: 'Community platform for the Russian-speaking Jewish world — events, your community, the AI Rabbi, and more.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FCFAF8',
    theme_color: '#FCFAF8',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
