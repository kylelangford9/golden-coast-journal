import type { Metadata } from 'next';
import { Libre_Franklin, Newsreader } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Script from 'next/script';
import { NetworkArrivalTracker } from '@/components/network-arrival-tracker';
import './globals.css';

const sans = Libre_Franklin({ variable: '--font-sans', subsets: ['latin'] });
const serif = Newsreader({ variable: '--font-serif', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.SITE_URL || 'https://golden-coast-journal.vercel.app',
  ),
  title: {
    default: 'The Golden Coast Journal',
    template: '%s | The Golden Coast Journal',
  },
  description:
    'Independent reporting and analysis from California to the world. No paywall. No ads.',
  applicationName: 'The Golden Coast Journal',
  alternates: { canonical: '/' },
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
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable}`}>
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
