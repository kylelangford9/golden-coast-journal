import { newsletterResultPage } from '@/lib/newsletter-pages';
import { readNewsletterToken } from '@/lib/newsletter-tokens';
import { getSupabase, unwrap } from '@/lib/supabase-server';

async function unsubscribeFromToken(rawToken: string | null) {
  const token = await readNewsletterToken(rawToken);
  if (!token.ok || token.purpose !== 'unsubscribe') {
    return newsletterResultPage({
      title: 'Unsubscribe link invalid',
      eyebrow: 'Reader list',
      heading: 'This unsubscribe link is not valid.',
      body: 'It may be incomplete or already used. Email kyle@goldencoastjournal.com if you need help leaving the list.',
      status: 400,
    });
  }

  const db = getSupabase();
  const subscriber = unwrap(
    await db
      .from('gcj_subscribers')
      .select('id,status')
      .eq('id', token.subscriberId)
      .maybeSingle(),
    'Unable to unsubscribe',
  ) as { id: string; status: string } | null;

  if (!subscriber) {
    return newsletterResultPage({
      title: 'Unsubscribe link invalid',
      eyebrow: 'Reader list',
      heading: 'This unsubscribe link is not valid.',
      body: 'We could not find a matching subscription. Email kyle@goldencoastjournal.com if you still receive briefings.',
      status: 400,
    });
  }

  if (subscriber.status !== 'unsubscribed') {
    unwrap(
      await db
        .from('gcj_subscribers')
        .update({ status: 'unsubscribed' })
        .eq('id', subscriber.id),
      'Unable to unsubscribe',
    );
  }

  return newsletterResultPage({
    title: 'Unsubscribed',
    eyebrow: 'Reader list',
    heading: 'You are unsubscribed.',
    body: 'Your address has been removed from the Golden Coast Journal briefing list. You can sign up again anytime from the homepage.',
    status: 200,
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    return await unsubscribeFromToken(url.searchParams.get('token'));
  } catch {
    return newsletterResultPage({
      title: 'Unsubscribe unavailable',
      eyebrow: 'Reader list',
      heading: 'Unsubscribe is temporarily unavailable.',
      body: 'Please try the link again in a few minutes, or email kyle@goldencoastjournal.com.',
      status: 503,
    });
  }
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    let token = url.searchParams.get('token');
    if (!token) {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const form = await request.formData();
        const value = form.get('token');
        token = typeof value === 'string' ? value : null;
      }
    }
    return await unsubscribeFromToken(token);
  } catch {
    return newsletterResultPage({
      title: 'Unsubscribe unavailable',
      eyebrow: 'Reader list',
      heading: 'Unsubscribe is temporarily unavailable.',
      body: 'Please try the link again in a few minutes, or email kyle@goldencoastjournal.com.',
      status: 503,
    });
  }
}
