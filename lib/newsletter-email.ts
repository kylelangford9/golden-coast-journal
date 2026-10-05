import 'server-only';
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
              <img src="${logo}" width="64" height="64" alt="The Golden Coast Journal" style="display:block;margin:0 auto 16px;border:0;" />
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
              <p style="margin:0 0 8px;">The Golden Coast Journal · Independent reporting from California to the world.</p>
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
