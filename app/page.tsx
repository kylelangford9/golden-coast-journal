import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { NewsletterForm } from '@/components/newsletter-form';
import { listPublished } from '@/lib/repository';
import { formatArticleDate } from '@/lib/content';
import { editorialAssetLabel, getApprovedEditorialAsset } from '@/lib/imagery';

export default async function Home() {
  const articles = await listPublished();
  const [lead, ...rest] = articles;
  const featurePair = rest.slice(0, 2);
  const latest = rest.slice(2);
  const leadImage = getApprovedEditorialAsset(lead.imageUrl);
  const origin = process.env.SITE_URL || 'https://golden-coast-journal.lunar-perch-0381.chatgpt.site';
  const publicationJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: 'The Golden Coast Journal',
    url: origin,
    logo: `${origin}/favicon.svg`,
    publishingPrinciples: `${origin}/standards`,
    correctionsPolicy: `${origin}/corrections`,
  }).replace(/</g, '\\u003c');

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: publicationJson }} />
      <a className="skip-link" href="#main-story">Skip to content</a>
      <SiteHeader />
      <div className="ticker">
        <div className="shell ticker-inner">
          <strong>Developing</strong>
          <span>Red-flag warnings prompt expanded fire readiness across Northern California</span>
          <Link href={`/article/${lead.slug}`}>Full report <ArrowRight size={14} /></Link>
        </div>
      </div>

      <section className="shell lead-grid" id="main-story">
        <article className="lead-copy">
          <p className="eyebrow">The California Briefing</p>
          <h1><Link href={`/article/${lead.slug}`}>{lead.title}</Link></h1>
          <p className="lead-dek">{lead.dek}</p>
          <div className="byline-row">
            <div className="byline-mark">GCJ</div>
            <div>
              <p>By {lead.author}</p>
              <span>Updated {formatArticleDate(lead.updatedAt)} · {lead.readingMinutes} min read</span>
            </div>
          </div>
        </article>
        <Link href={`/article/${lead.slug}`} className="lead-visual" aria-label={`Read: ${lead.title}`}>
          <Image src={leadImage.url} alt={leadImage.alt} fill priority sizes="(max-width: 900px) 100vw, 62vw" />
          <span className="photo-caption">{editorialAssetLabel(leadImage)} · {leadImage.credit}</span>
        </Link>
      </section>

      <section className="shell top-stories" aria-labelledby="top-stories-title">
        <div className="section-heading">
          <h2 id="top-stories-title">Across the Golden Coast</h2>
          <p>Reporting that explains what changed — and why it matters.</p>
        </div>
        <div className="feature-pair">
          {featurePair.map((article) => (
            <article className="image-story" key={article.slug}>
              <Link href={`/article/${article.slug}`} className="image-frame">
                <Image src={article.imageUrl} alt={article.imageAlt} fill sizes="(max-width: 760px) 100vw, 50vw" />
                <span className="photo-caption">{editorialAssetLabel(getApprovedEditorialAsset(article.imageUrl))} · {getApprovedEditorialAsset(article.imageUrl).credit}</span>
              </Link>
              <p className="eyebrow">{article.section}</p>
              <h3><Link href={`/article/${article.slug}`}>{article.title}</Link></h3>
              <p>{article.dek}</p>
              <span>{article.readingMinutes} min read</span>
            </article>
          ))}
        </div>
      </section>

      <section className="shell briefing" id="latest" aria-labelledby="briefing-title">
        <div className="section-heading">
          <h2 id="briefing-title">The Sunday Briefing</h2>
          <p>Essential reporting, without the noise.</p>
        </div>
        <div className="brief-grid">
          {latest.map((article, index) => (
            <article className="brief-card" key={article.slug}>
              <span className="brief-number">0{index + 1}</span>
              <p className="eyebrow">{article.section}</p>
              <h3><Link href={`/article/${article.slug}`}>{article.title}</Link></h3>
              <p>{article.dek}</p>
              <span className="source-note">By {article.author} · {article.readingMinutes} min</span>
            </article>
          ))}
        </div>
      </section>

      <section className="newsletter-band">
        <div className="shell newsletter-band-inner">
          <div><p className="eyebrow">The morning edition</p><h2>Start informed.<br />Stay unhurried.</h2></div>
          <NewsletterForm />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
