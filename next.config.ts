import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      // Editorial imagery is copied into our own storage, so the Journal's
      // own pictures need exactly one entry here. The remaining hosts serve the
      // official portraits in the California Votes representatives register,
      // which other applications own and we only read.
      { protocol: 'https', hostname: 'eoifovdmuuqdcospamru.supabase.co' },
      { protocol: 'https', hostname: 'webapi.assembly.ca.gov' },
      { protocol: 'https', hostname: 'clerk.house.gov' },
      { protocol: 'https', hostname: 'www.senate.ca.gov' },
      { protocol: 'https', hostname: 'www.congress.gov' },
      { protocol: 'https', hostname: 'www.boe.ca.gov' },
      { protocol: 'https', hostname: 'www.sco.ca.gov' },
      { protocol: 'https', hostname: 'admin.cdn.sos.ca.gov' },
      { protocol: 'https', hostname: 'www.insurance.ca.gov' },
      { protocol: 'https', hostname: 'ltg.ca.gov' },
      { protocol: 'https', hostname: 'www.treasurer.ca.gov' },
      { protocol: 'https', hostname: 'oag.ca.gov' },
      { protocol: 'https', hostname: 'www.cde.ca.gov' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'golden-coast-journal.vercel.app' }],
        destination: 'https://www.goldencoastjournal.com/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'goldencoastjournal.com' }],
        destination: 'https://www.goldencoastjournal.com/:path*',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; img-src 'self' data: https://thumb.wikimedia.org; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://www.kylelangford.org; connect-src 'self' https://www.kylelangford.org; object-src 'none'; base-uri 'self'; frame-ancestors 'self' https://kylelangford.org https://www.kylelangford.org; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
