import 'server-only';

import { articleUrl } from '@/lib/indexnow';
import {
  createNewsletterToken,
  type NewsletterTokenPurpose,
} from '@/lib/newsletter-tokens';

function siteUrl() {
  return (process.env.SITE_URL || 'https://www.goldencoastjournal.com').replace(/\/$/, '');
}

export async function newsletterActionUrl(
  purpose: NewsletterTokenPurpose,
  subscriberId: string,
) {
  const token = await createNewsletterToken(subscriberId, purpose);
  const path = purpose === 'confirm' ? 'confirm' : 'unsubscribe';
  return `${siteUrl()}/api/newsletter/${path}?token=${encodeURIComponent(token)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncateText(value: string, max = 220) {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  const slice = cleaned.slice(0, max - 1);
  const cut = slice.lastIndexOf(' ');
  return `${(cut > 80 ? slice.slice(0, cut) : slice).trim()}…`;
}

function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function confirmationEmailContent(confirmUrl: string, unsubscribeUrl: string) {
  const logo = `${siteUrl()}/icon-192.png`;
  const text = [
    'Confirm your Golden Coast Journal subscription',
    '',
    'Thanks for signing up for The Golden Coast Journal briefing.',
    'Please confirm your email address so we know it is really you:',
    '',
    confirmUrl,
    '',
    'If you did not ask for this, you can ignore this message and nothing further will be sent.',
    '',
    `Unsubscribe: ${unsubscribeUrl}`,
    '',
    'The Golden Coast Journal',
    'Independent reporting from California to the world.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Confirm your subscription</title>
</head>
<body style="margin:0;padding:0;background:#f6f1e7;color:#161713;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1e7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffdf8;border:1px solid #c9c1b2;border-top:3px solid #d8a82a;">
          <tr>
            <td style="padding:28px 28px 8px;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 16px;border-collapse:separate;">
                <tr>
                  <td style="border-radius:12px;overflow:hidden;line-height:0;">
                    <img src="${logo}" width="64" height="64" alt="The Golden Coast Journal" style="display:block;border:0;border-radius:12px;" />
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#545148;">The Golden Coast Journal</p>
              <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;font-weight:normal;color:#161713;">Confirm your subscription</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 8px;font-size:17px;line-height:1.55;color:#161713;">
              <p style="margin:0 0 16px;">Thanks for signing up for the California briefing. Confirm your address and we will keep it on the reader list.</p>
              <p style="margin:0 0 24px;text-align:center;">
                <a href="${escapeHtml(confirmUrl)}" style="display:inline-block;background:#17364a;color:#fffdf8;text-decoration:none;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;border-radius:2px;">Confirm subscription</a>
              </p>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#545148;">If the button does not work, open this link:</p>
              <p style="margin:0 0 16px;font-size:13px;line-height:1.4;word-break:break-all;"><a href="${escapeHtml(confirmUrl)}" style="color:#17364a;">${escapeHtml(confirmUrl)}</a></p>
              <p style="margin:0;font-size:14px;line-height:1.5;color:#545148;">If you did not ask for this, ignore the message and nothing further will be sent.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;border-top:1px solid #c9c1b2;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#545148;">
              <p style="margin:0 0 8px;">The Golden Coast Journal — Independent reporting from California to the world.</p>
              <p style="margin:0;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#545148;">Unsubscribe</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject: 'Confirm your Golden Coast Journal subscription', html, text };
}

export type DigestStory = {
  slug: string;
  title: string;
  dek: string | null;
  image_url: string | null;
  section: string | null;
  published_at: string | null;
};

function digestSubject(when = new Date()) {
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(when);
  return `California briefing — ${label}`;
}

export function digestEmailContent(
  stories: DigestStory[],
  unsubscribeUrl: string,
  when = new Date(),
) {
  const logo = `${siteUrl()}/icon-192.png`;
  const subject = digestSubject(when);
  const home = siteUrl();

  const textStories = stories
    .map((story, index) => {
      const dek = story.dek ? truncateText(story.dek, 180) : '';
      return [
        `${index + 1}. ${story.title}`,
        dek ? `   ${dek}` : null,
        `   ${articleUrl(story.slug)}`,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');

  const text = [
    subject,
    '',
    'The Golden Coast Journal California briefing.',
    '',
    textStories,
    '',
    `Read more: ${home}`,
    '',
    `Unsubscribe: ${unsubscribeUrl}`,
    '',
    'The Golden Coast Journal',
    'Independent reporting from California to the world.',
  ].join('\n');

  const storyRows = stories
    .map((story) => {
      const href = escapeHtml(articleUrl(story.slug));
      const title = escapeHtml(story.title);
      const dek = story.dek
        ? `<p style="margin:8px 0 0;font-size:15px;line-height:1.5;color:#545148;">${escapeHtml(truncateText(story.dek, 200))}</p>`
        : '';
      const image = isHttpUrl(story.image_url)
        ? `<a href="${href}" style="display:block;margin:0 0 12px;text-decoration:none;">
              <img src="${escapeHtml(story.image_url)}" alt="" width="504" style="display:block;width:100%;max-width:504px;height:auto;border:0;border-radius:4px;" />
            </a>`
        : '';
      const section = story.section
        ? `<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#545148;">${escapeHtml(story.section)}</p>`
        : '';
      return `<tr>
            <td style="padding:0 0 24px;">
              ${image}
              ${section}
              <h2 style="margin:0;font-size:20px;line-height:1.3;font-weight:normal;">
                <a href="${href}" style="color:#161713;text-decoration:none;">${title}</a>
              </h2>
              ${dek}
              <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;">
                <a href="${href}" style="color:#17364a;text-decoration:none;">Read the story →</a>
              </p>
            </td>
          </tr>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f6f1e7;color:#161713;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1e7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffdf8;border:1px solid #c9c1b2;border-top:3px solid #d8a82a;">
          <tr>
            <td style="padding:28px 28px 8px;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 16px;border-collapse:separate;">
                <tr>
                  <td style="border-radius:12px;overflow:hidden;line-height:0;">
                    <img src="${logo}" width="64" height="64" alt="The Golden Coast Journal" style="display:block;border:0;border-radius:12px;" />
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#545148;">The Golden Coast Journal</p>
              <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;font-weight:normal;color:#161713;">California briefing</h1>
              <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#545148;">${escapeHtml(
                new Intl.DateTimeFormat('en-US', {
                  timeZone: 'America/Los_Angeles',
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                }).format(when),
              )}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 4px;font-size:16px;line-height:1.55;color:#161713;">
              <p style="margin:0 0 20px;">Recent reporting from California, selected for readers on the briefing list.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                ${storyRows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;border-top:1px solid #c9c1b2;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#545148;">
              <p style="margin:16px 0 8px;"><a href="${escapeHtml(home)}" style="color:#17364a;">Visit The Golden Coast Journal</a></p>
              <p style="margin:0 0 8px;">The Golden Coast Journal — Independent reporting from California to the world.</p>
              <p style="margin:0;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#545148;">Unsubscribe</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

export async function sendConfirmationEmail(input: {
  email: string;
  subscriberId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Confirmation email skipped; RESEND_API_KEY is missing',
        route: '/api/newsletter',
        subscriber_id: input.subscriberId,
      }),
    );
    return { sent: false as const };
  }

  const confirmUrl = await newsletterActionUrl('confirm', input.subscriberId);
  const unsubscribeUrl = await newsletterActionUrl('unsubscribe', input.subscriberId);
  const content = confirmationEmailContent(confirmUrl, unsubscribeUrl);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: 'The Golden Coast Journal <newsletter@goldencoastjournal.com>',
        to: [input.email],
        reply_to: 'kyle@goldencoastjournal.com',
        subject: content.subject,
        html: content.html,
        text: content.text,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    });
    const body = (await response.json().catch(() => null)) as {
      id?: string;
      message?: string;
      name?: string;
    } | null;
    if (!response.ok) {
      console.error(
        JSON.stringify({
          level: 'error',
          message: 'Confirmation email failed',
          route: '/api/newsletter',
          subscriber_id: input.subscriberId,
          status: response.status,
          error: body?.message || body?.name || 'unknown',
        }),
      );
      return { sent: false as const };
    }
    console.log(
      JSON.stringify({
        level: 'info',
        message: 'Confirmation email sent',
        route: '/api/newsletter',
        subscriber_id: input.subscriberId,
        email_id: body?.id || null,
      }),
    );
    return { sent: true as const, id: body?.id || null };
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Confirmation email threw',
        route: '/api/newsletter',
        subscriber_id: input.subscriberId,
        error: error instanceof Error ? error.message : 'unknown',
      }),
    );
    return { sent: false as const };
  }
}

export type DigestSubscriber = {
  id: string;
  email: string;
};

export type DigestSendResult = {
  subscriberId: string;
  email: string;
  ok: boolean;
  id: string | null;
  error: string | null;
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendDigestBatch(input: {
  subscribers: DigestSubscriber[];
  stories: DigestStory[];
}): Promise<{
  sent: number;
  failed: number;
  results: DigestSendResult[];
  subject: string;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  const subject = digestSubject();
  if (!apiKey) {
    return {
      sent: 0,
      failed: input.subscribers.length,
      subject,
      results: input.subscribers.map((subscriber) => ({
        subscriberId: subscriber.id,
        email: subscriber.email,
        ok: false,
        id: null,
        error: 'RESEND_API_KEY is missing',
      })),
    };
  }

  const results: DigestSendResult[] = [];
  const chunkSize = 50;

  for (let offset = 0; offset < input.subscribers.length; offset += chunkSize) {
    const chunk = input.subscribers.slice(offset, offset + chunkSize);
    const payloads = await Promise.all(
      chunk.map(async (subscriber) => {
        const unsubscribeUrl = await newsletterActionUrl(
          'unsubscribe',
          subscriber.id,
        );
        const content = digestEmailContent(input.stories, unsubscribeUrl);
        return {
          subscriber,
          unsubscribeUrl,
          payload: {
            from: 'The Golden Coast Journal <newsletter@goldencoastjournal.com>',
            to: [subscriber.email],
            reply_to: 'kyle@goldencoastjournal.com',
            subject: content.subject,
            html: content.html,
            text: content.text,
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          },
        };
      }),
    );

    try {
      const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payloads.map((item) => item.payload)),
      });
      const body = (await response.json().catch(() => null)) as
        | { data?: Array<{ id?: string }>; message?: string; name?: string }
        | Array<{ id?: string }>
        | null;

      if (!response.ok) {
        const error =
          body && !Array.isArray(body)
            ? body.message || body.name || `HTTP ${response.status}`
            : `HTTP ${response.status}`;
        for (const item of payloads) {
          results.push({
            subscriberId: item.subscriber.id,
            email: item.subscriber.email,
            ok: false,
            id: null,
            error,
          });
        }
      } else {
        const rows = Array.isArray(body)
          ? body
          : Array.isArray(body?.data)
            ? body.data
            : [];
        payloads.forEach((item, index) => {
          const id = rows[index]?.id || null;
          results.push({
            subscriberId: item.subscriber.id,
            email: item.subscriber.email,
            ok: Boolean(id),
            id,
            error: id ? null : 'Missing email id in batch response',
          });
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      for (const item of payloads) {
        results.push({
          subscriberId: item.subscriber.id,
          email: item.subscriber.email,
          ok: false,
          id: null,
          error: message,
        });
      }
    }

    if (offset + chunkSize < input.subscribers.length) await sleep(600);
  }

  return {
    subject,
    sent: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  };
}