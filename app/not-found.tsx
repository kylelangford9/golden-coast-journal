import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export default function NotFound() {
  return (
    <main><SiteHeader /><section className="not-found shell"><p className="eyebrow">404</p><h1>This page missed the edition.</h1><p>The story may have moved, or the address may be incomplete.</p><Link href="/">Return to today’s front page</Link></section><SiteFooter /></main>
  );
}
