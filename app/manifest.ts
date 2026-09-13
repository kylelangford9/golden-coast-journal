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
  };
}
