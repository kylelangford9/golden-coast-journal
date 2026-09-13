import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <p className="footer-mark"><span>The</span> Golden Coast Journal</p>
          <p className="footer-note">News for the whole coast. No paywall. No ads.</p>
        </div>
        <nav aria-label="About the Journal">
          <strong>Journal</strong>
          <Link href="/about">About</Link>
          <Link href="/standards">Standards & AI policy</Link>
          <Link href="/corrections">Corrections</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
        <nav aria-label="Explore sections">
          <strong>Explore</strong>
          <Link href="/section/california">California</Link>
          <Link href="/section/business">Business</Link>
          <Link href="/section/technology">Technology</Link>
        </nav>
      </div>
      <div className="shell footer-bottom">
        <span>© 2026 The Golden Coast Journal</span>
        <span>Reader-supported in spirit, freely available by design.</span>
      </div>
    </footer>
  );
}
