import Link from 'next/link';
import { TrackedNetworkLink } from '@/components/tracked-network-link';

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
        <nav aria-label="Explore the project network">
          <strong>Project network</strong>
          <TrackedNetworkLink href="https://www.kylelangford.org/?utm_source=golden_coast_journal&amp;utm_medium=referral&amp;utm_campaign=project_network" destination="Kyle Langford">Kyle Langford</TrackedNetworkLink>
          <TrackedNetworkLink href="https://anvil.builders/?utm_source=golden_coast_journal&amp;utm_medium=referral&amp;utm_campaign=project_network" destination="Anvil">Anvil</TrackedNetworkLink>
          <TrackedNetworkLink href="https://langbeat.live/?utm_source=golden_coast_journal&amp;utm_medium=referral&amp;utm_campaign=project_network" destination="LangBeat">LangBeat</TrackedNetworkLink>
          <TrackedNetworkLink href="https://theonecompass.app/?utm_source=golden_coast_journal&amp;utm_medium=referral&amp;utm_campaign=project_network" destination="The One">The One</TrackedNetworkLink>
        </nav>
      </div>
      <div className="shell footer-bottom">
        <span>© 2026 The Golden Coast Journal</span>
        <span>A Kyle Langford project · Editorially independent.</span>
      </div>
    </footer>
  );
}
