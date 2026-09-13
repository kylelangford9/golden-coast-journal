import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export const metadata = { title: 'About', description: 'Why The Golden Coast Journal exists and how we work.' };

export default function AboutPage() {
  return (
    <main>
      <SiteHeader />
      <article className="institutional shell">
        <p className="eyebrow">About the Journal</p>
        <h1>Built for readers, not interruptions.</h1>
        <p className="standfirst">The Golden Coast Journal is an independent digital newspaper covering California and the wider world with clarity, context and respect for the reader’s time.</p>
        <div className="institutional-grid">
          <section><h2>Our promise</h2><p>No paywall. No advertising. No manufactured outrage. We want every report to answer three questions: what happened, what is known and why it matters.</p></section>
          <section><h2>Our ownership</h2><p>The Journal is created and published by Kyle Langford as part of his project network. Its editorial judgments remain independent from the network’s other products. Bylines name institutional desks rather than invented human reporters.</p></section>
          <section><h2>Our method</h2><p>Automation helps monitor primary sources, organize material and prepare drafts. Published work follows our sourcing, verification and corrections standards.</p></section>
          <section><h2>Our scope</h2><p>We begin on the Golden Coast — its government, climate, economy, technology and culture — while keeping a clear view of the nation and world.</p></section>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
