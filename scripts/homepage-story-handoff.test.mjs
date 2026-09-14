import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const homepage = readFileSync('app/page.tsx', 'utf8');
const component = readFileSync('components/homepage-story-link.tsx', 'utf8');
const styles = readFileSync('app/globals.css', 'utf8');

assert.ok(homepage.includes("import { HomepageStoryLink }"));
assert.equal(
  homepage.match(/<HomepageStoryLink/g)?.length,
  3,
  'the headline, lead image and explicit action should share the measured link',
);
assert.ok(homepage.includes('surface="lead_headline"'));
assert.ok(homepage.includes('surface="lead_image"'));
assert.ok(homepage.includes('surface="lead_cta"'));
assert.ok(homepage.includes('Read the full report'));

assert.ok(component.startsWith("'use client';"));
assert.ok(component.includes("track('Homepage Story Selected'"));
assert.ok(
  component.includes(
    "trackPortfolioGrowth('homepage_story_selected', metadata)",
  ),
);
assert.ok(component.includes('window.sessionStorage.getItem(checkpoint)'));
assert.ok(component.includes('`${CHECKPOINT_PREFIX}${articleSlug}`'));
assert.ok(!component.includes('${surface}'));
assert.ok(component.includes('article_slug: articleSlug'));
assert.ok(component.includes('onClick={recordSelection}'));

assert.match(styles, /\.lead-read-link \{[^}]*min-height: 44px;/);

console.log(
  'PASS homepage lead story has one measured selection checkpoint and a clear action',
);
