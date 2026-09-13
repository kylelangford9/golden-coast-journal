import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const articles = sqliteTable('articles', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull(),
  section: text('section').notNull(),
  title: text('title').notNull(),
  dek: text('dek').notNull(),
  bodyJson: text('body_json').notNull(),
  keyPointsJson: text('key_points_json').notNull().default('[]'),
  author: text('author').notNull(),
  imageUrl: text('image_url'),
  imageAlt: text('image_alt'),
  imageCredit: text('image_credit'),
  sourcesJson: text('sources_json').notNull(),
  status: text('status', { enum: ['draft', 'review', 'published', 'archived'] }).notNull().default('draft'),
  featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
  confidence: integer('confidence').notNull().default(0),
  publishedAt: text('published_at'),
  updatedAt: text('updated_at').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [
  uniqueIndex('idx_articles_slug').on(table.slug),
  index('idx_articles_status_published').on(table.status, table.publishedAt),
  index('idx_articles_status_created').on(table.status, table.createdAt),
  index('idx_articles_section_published').on(table.section, table.publishedAt),
]);

export const sources = sqliteTable('sources', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  feedUrl: text('feed_url').notNull(),
  homepageUrl: text('homepage_url').notNull(),
  section: text('section').notNull(),
  trustTier: integer('trust_tier').notNull().default(2),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  lastFetchedAt: text('last_fetched_at'),
}, (table) => [uniqueIndex('idx_sources_feed_url').on(table.feedUrl)]);

export const storyCandidates = sqliteTable('story_candidates', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => sources.id, { onDelete: 'cascade' }),
  externalUrl: text('external_url').notNull(),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  publishedAt: text('published_at'),
  discoveredAt: text('discovered_at').notNull(),
  status: text('status', { enum: ['new', 'selected', 'processed', 'rejected'] }).notNull().default('new'),
  score: integer('score').notNull().default(0),
}, (table) => [
  uniqueIndex('idx_candidates_external_url').on(table.externalUrl),
  index('idx_candidates_status_score').on(table.status, table.score),
]);

export const pipelineRuns = sqliteTable('pipeline_runs', {
  id: text('id').primaryKey(),
  runType: text('run_type').notNull(),
  status: text('status', { enum: ['running', 'succeeded', 'partial', 'failed'] }).notNull(),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  metricsJson: text('metrics_json').notNull().default('{}'),
  error: text('error'),
}, (table) => [index('idx_pipeline_runs_started').on(table.startedAt)]);

export const corrections = sqliteTable('corrections', {
  id: text('id').primaryKey(),
  articleId: text('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  note: text('note').notNull(),
  correctedAt: text('corrected_at').notNull(),
}, (table) => [index('idx_corrections_article').on(table.articleId)]);

export const subscribers = sqliteTable('subscribers', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  status: text('status', { enum: ['pending', 'active', 'unsubscribed'] }).notNull().default('pending'),
  createdAt: text('created_at').notNull(),
  confirmedAt: text('confirmed_at'),
}, (table) => [uniqueIndex('idx_subscribers_email').on(table.email)]);

export const requestLimits = sqliteTable('request_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(1),
  windowStart: integer('window_start').notNull(),
});

export const editorialActions = sqliteTable('editorial_actions', {
  id: text('id').primaryKey(),
  articleId: text('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  action: text('action', { enum: ['drafted', 'published', 'rejected', 'reopened'] }).notNull(),
  actor: text('actor').notNull().default('editorial-api'),
  note: text('note'),
  createdAt: text('created_at').notNull(),
}, (table) => [index('idx_editorial_actions_article_created').on(table.articleId, table.createdAt)]);
