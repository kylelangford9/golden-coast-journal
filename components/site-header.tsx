import Link from 'next/link';
import { Menu, Search } from 'lucide-react';
import { sections } from '@/lib/content';
import { NewsletterCtaLink } from '@/components/newsletter-cta-link';

const nav = ['Latest', 'Briefing Preview', 'Live Desk', 'Election Calendar', ...sections];

export function SiteHeader() {
  const editionDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' }).format(new Date());
  return (
    <header className="site-header">
      <div className="utility-row shell">
        <p>{editionDate}</p>
        <p className="edition">Pacific Edition</p>
        <div className="utility-actions">
          <NewsletterCtaLink />
          <details className="header-panel menu-panel">
            <summary aria-label="Open menu"><Menu size={18} strokeWidth={1.6} /></summary>
            <div className="panel-content">
              <strong>The Golden Coast Journal</strong>
              <span>Independent reporting for an informed coast.</span>
              <nav aria-label="Expanded navigation">
                <Link href="/">Home</Link>
                {sections.map((item) => <Link key={item} href={`/section/${item.toLowerCase()}`}>{item}</Link>)}
                <Link href="/about">About</Link>
                <Link href="/standards">Standards & AI policy</Link>
                <Link href="/corrections">Corrections</Link>
              </nav>
            </div>
          </details>
          <details className="header-panel search-panel">
            <summary aria-label="Search"><Search size={18} strokeWidth={1.6} /></summary>
            <div className="panel-content">
              <strong>Search the Journal</strong>
              <span>Find reporting by topic, place or headline.</span>
              <form action="/search" method="get" className="search-form">
                <input name="q" type="search" placeholder="Search stories…" aria-label="Search stories" />
                <button type="submit">Search</button>
              </form>
            </div>
          </details>
        </div>
      </div>
      <div className="masthead shell">
        <p className="kicker">Independent. Clear. California.</p>
        <Link href="/" className="wordmark" aria-label="The Golden Coast Journal home"><span>The</span> Golden Coast Journal</Link>
        <p className="weather">No paywall · No ads</p>
      </div>
      <nav className="primary-nav" aria-label="Primary navigation">
        <div className="shell nav-track">
          {nav.map((item) => <Link key={item} href={item === 'Latest' ? '/#latest' : item === 'Briefing Preview' ? '/briefing' : item === 'Live Desk' ? '/#live-desk' : item === 'Election Calendar' ? '/article/california-2026-general-election-deadlines' : `/section/${item.toLowerCase()}`}>{item}</Link>)}
        </div>
      </nav>
    </header>
  );
}
