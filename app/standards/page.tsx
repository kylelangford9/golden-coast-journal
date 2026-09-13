import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export const metadata = { title: 'Standards & AI Policy', description: 'The sourcing, automation and publication standards of The Golden Coast Journal.' };

const standards = [
  ['Source first', 'Every factual report begins with attributable material. Primary records, public data and direct statements are preferred, and source links remain attached to the published story.'],
  ['Automation with accountability', 'Software may discover stories, compare records and draft original language. It does not change our obligation to distinguish fact, analysis and uncertainty. The publisher remains accountable for everything on this site.'],
  ['No invented certainty', 'Names, figures, dates and quotations must be supported. When information is incomplete or changing, the story says so plainly.'],
  ['Independent writing', 'We summarize and synthesize; we do not republish another newsroom’s article. Original reporting and source material receive visible credit.'],
  ['Real photographs, always', 'Photographs of people, places and events must be authentic, attributable camera-made images from approved sources. We do not publish AI-generated or synthetic imagery as photography. AI may assist with logos, typography and clearly designed graphics, but never with a scene that readers could mistake for documentary evidence.'],
  ['Publication thresholds', 'Routine briefs from authoritative primary sources may be published automatically after structured checks. Sensitive claims, allegations, elections, health, public safety and conflicts require heightened review.'],
  ['Corrections that persist', 'Material corrections are attached to the article with the date and substance of the change. We do not silently rewrite consequential errors.'],
];

export default function StandardsPage() {
  return (
    <main>
      <SiteHeader />
      <article className="institutional shell">
        <p className="eyebrow">Editorial code</p>
        <h1>Our standards are part of the product.</h1>
        <p className="standfirst">Trust should not depend on whether a reader knows how a story was produced. These rules govern every report, including work prepared with artificial intelligence.</p>
        <div className="standards-list">
          {standards.map(([title, body], index) => <section key={title}><span>0{index + 1}</span><div><h2>{title}</h2><p>{body}</p></div></section>)}
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
