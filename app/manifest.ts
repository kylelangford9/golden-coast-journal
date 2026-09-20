import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'The Golden Coast Journal',
    short_name: 'GCJ',
    description: 'Independent reporting and analysis from California to the world.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f1e7',
    theme_color: '#17364a',
    // The manifest declared no icons at all, so an installed copy had no mark.
    // The maskable one keeps the T inside the safe zone, because Android crops
    // a maskable icon to whatever shape the launcher uses.
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
