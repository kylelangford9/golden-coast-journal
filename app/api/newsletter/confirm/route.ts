import { newsletterResultPage } from '@/lib/newsletter-pages';
import { readNewsletterToken } from '@/lib/newsletter-tokens';
import { getSupabase, unwrap } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = await readNewsletterToken(url.searchParams.get('token'));
    if (!token.ok || token.purpose !== 'confirm') {
      return newsletterResultPage({
        title: 'Confirmation link invalid',
        eyebrow: 'Reader list',
        heading: 'This confirmation link is not valid.',
        body: 'It may be incomplete, expired, or already used. Request a fresh confirmation from the Journal homepage if you still want the briefing.',
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
      'Unable to confirm subscriber',
    ) as { id: string; status: string } | null;

    if (!subscriber) {
      return newsletterResultPage({
        title: 'Confirmation link invalid',
        eyebrow: 'Reader list',
        heading: 'This confirmation link is not valid.',
        body: 'We could not find a matching subscription. Sign up again from the Journal homepage if you still want the briefing.',
        status: 400,
      });
    }

    if (subscriber.status === 'confirmed' || subscriber.status === 'active') {
      return newsletterResultPage({
        title: 'Already confirmed',
        eyebrow: 'Reader list',
        heading: 'You are already on the reader list.',
        body: 'No further action is needed. The California briefing will arrive at this address.',
        status: 200,
      });
    }

    if (subscriber.status === 'unsubscribed') {
      return newsletterResultPage({
        title: 'Subscription inactive',
        eyebrow: 'Reader list',
        heading: 'This address is unsubscribed.',
        body: 'Sign up again from the Journal homepage if you would like to rejoin the briefing.',
        status: 400,
      });
    }

    unwrap(
      await db
        .from('gcj_subscribers')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', subscriber.id)
        .eq('status', 'pending'),
      'Unable to confirm subscriber',
    );

    return newsletterResultPage({
      title: 'Subscription confirmed',
      eyebrow: 'Reader list',
      heading: 'You are confirmed.',
      body: 'Thanks. Your address is on the Golden Coast Journal reader list for the California briefing.',
      status: 200,
    });
  } catch {
    return newsletterResultPage({
      title: 'Confirmation unavailable',
      eyebrow: 'Reader list',
      heading: 'Confirmation is temporarily unavailable.',
      body: 'Please try the link again in a few minutes.',
      status: 503,
    });
  }
}
