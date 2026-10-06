import { notFound, permanentRedirect } from 'next/navigation';
import { resolvePublishedSlug } from '@/lib/repository';

// Outreach emails went out with /california/{slug} links, built from the
// story's section instead of the /article/{slug} path the Journal serves.
// Send those readers on to the story; anything else stays a 404.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const target = await resolvePublishedSlug((slug.at(-1) ?? '').toLowerCase());
  if (!target) notFound();
  permanentRedirect(`/article/${target}`);
}
