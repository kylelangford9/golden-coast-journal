import type { Metadata } from 'next';
import { Libre_Franklin, Newsreader } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Script from 'next/script';
import { NetworkArrivalTracker } from '@/components/network-arrival-tracker';
import './globals.css';

const sans = Libre_Franklin({ variable: '--font-sans', subsets: ['latin'] });
const serif = Newsreader({ variable: '--font-serif', subsets: ['latin'] });
const origin = process.env.SITE_URL || 'https://www.goldencoastjournal.com';

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: {
    default: 'The Golden Coast Journal',
    template: '%s | The Golden Coast Journal',
  },
  description:
    'Independent reporting and analysis from California to the world. No paywall. No ads.',
  applicationName: 'The Golden Coast Journal',
  openGraph: {
    type: 'website',
    siteName: 'The Golden Coast Journal',
    title: 'The Golden Coast Journal',
    description:
      'Independent reporting and analysis from California to the world. No paywall. No ads.',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'The Golden Coast Journal title over a real photograph of Santa Barbara, California',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Golden Coast Journal',
    description:
      'Independent reporting and analysis from California to the world. No paywall. No ads.',
    images: ['/og.png'],
  },
  // One PNG was the whole icon set, so iOS had no home-screen mark at all.
  // Raster only, smallest first: the vector in public/ stays unreferenced on
  // purpose, because the favicon crawler wants a PNG at a multiple of 48 and
  // canonical-metadata.test.mjs holds that decision in place.
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: '96x96' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
    shortcut: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const publicationJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    '@id': `${origin}/#organization`,
    name: 'The Golden Coast Journal',
    url: origin,
    description:
      'Independent reporting and analysis from California to the world. No paywall. No ads.',
    // The square mark, not the 1200x630 social card that used to be declared
    // here. A share image is not a logo: it carries the headline artwork, and
    // search results asking an organisation for its logo got a banner.
    logo: {
      '@type': 'ImageObject',
      url: `${origin}/icon-512.png`,
      width: 512,
      height: 512,
      caption: 'The Golden Coast Journal',
    },
    image: {
      '@type': 'ImageObject',
      url: `${origin}/og.png`,
      width: 1200,
      height: 630,
    },
    founder: {
      '@type': 'Person',
      name: 'Kyle Langford',
      url: 'https://www.kylelangford.org',
    },
    publishingPrinciples: `${origin}/standards`,
    correctionsPolicy: `${origin}/corrections`,
    ownershipFundingInfo: `${origin}/about`,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'newsroom, corrections and privacy',
      email: 'kyle@kylelangford.org',
      url: `${origin}/contact`,
    },
    isAccessibleForFree: true,
  }).replace(/</g, '\\u003c');

  return (
    <html lang="en">
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="The Golden Coast Journal"
          href={`${origin}/feed.xml`}
        />
      </head>
      <body className={`${sans.variable} ${serif.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: publicationJson }}
        />
        {children}
        <NetworkArrivalTracker />
        <Script
          src="https://www.kylelangford.org/growth.js"
          strategy="afterInteractive"
          data-site="golden-coast-journal"
        />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
