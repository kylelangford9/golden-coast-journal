import Image from 'next/image';
import Link from 'next/link';
import { TrackedNetworkLink } from '@/components/tracked-network-link';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <p className="footer-mark">
            <span>The</span> Golden Coast Journal
          </p>
          <div className="footer-masthead-photo photo-frame ratio-card">
            <Image
              src="/oroville.jpg"
              alt="Aerial photograph of Lake Oroville and the surrounding California foothills"
              fill
              sizes="(max-width: 760px) 100vw, 320px"
              loading="lazy"
            />
            <span className="photo-caption">
              Photograph · Florence Low / California Department of Water Resources
            </span>
          </div>
          <p className="footer-note">
            News for the whole coast. No paywall. No ads.
          </p>
        </div>
        <nav aria-label="About the Journal">
          <strong>Journal</strong>
          <Link href="/live">California live desk</Link>
          <Link href="/california-election-2026">2026 election guide</Link>
          <Link href="/california-candidates-2026">2026 candidate guide</Link>
          <Link href="/california-propositions-2026">
            2026 proposition guide
          </Link>
          <Link href="/california-deadlines">California deadlines</Link>
          <Link href="/briefing">Briefing preview</Link>
          <Link href="/about">About</Link>
          <Link href="/standards">Standards & AI policy</Link>
          <Link href="/corrections">Corrections</Link>
          <Link href="/contact">Contact</Link>
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
          <TrackedNetworkLink
            href="https://www.kylelangford.org/?utm_source=golden_coast_journal&amp;utm_medium=referral&amp;utm_campaign=project_network"
            destination="Kyle Langford"
          >
            Kyle Langford
          </TrackedNetworkLink>
          <TrackedNetworkLink
            href="https://anvil.builders/?utm_source=golden_coast_journal&amp;utm_medium=referral&amp;utm_campaign=project_network"
            destination="Anvil"
          >
            Anvil
          </TrackedNetworkLink>
          <TrackedNetworkLink
            href="https://langbeat.live/?utm_source=golden_coast_journal&amp;utm_medium=referral&amp;utm_campaign=project_network"
            destination="LangBeat"
          >
            LangBeat
          </TrackedNetworkLink>
          <TrackedNetworkLink
            href="https://theonecompass.app/?utm_source=golden_coast_journal&amp;utm_medium=referral&amp;utm_campaign=project_network"
            destination="The One"
          >
            The One
          </TrackedNetworkLink>
        </nav>
      </div>
      <div className="footer-visual photo-frame">
        <Image
          src="/california-coast.jpg"
          alt="Aerial photograph of Santa Barbara, California, meeting the Pacific Ocean"
          fill
          sizes="100vw"
          loading="lazy"
        />
        <span className="photo-caption">
          Photograph · Clayton Cardinalli / Unsplash
        </span>
      </div>
      <div className="shell footer-bottom">
        <span>© 2026 The Golden Coast Journal</span>
        <span>A Kyle Langford project · Editorially independent.</span>
      </div>
    </footer>
  );
}
