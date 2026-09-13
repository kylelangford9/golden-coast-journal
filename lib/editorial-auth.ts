import { env } from 'cloudflare:workers';

export type EditorialAuth = 'authorized' | 'unauthorized' | 'unconfigured';

async function safeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function verifyEditorialRequest(request: Request): Promise<EditorialAuth> {
  if (!env.CRON_SECRET) return 'unconfigured';
  const token = request.headers.get('authorization') || '';
  return (await safeEqual(token, `Bearer ${env.CRON_SECRET}`)) ? 'authorized' : 'unauthorized';
}
