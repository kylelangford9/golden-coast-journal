import { NextResponse } from 'next/server';
import { verifyEditorialRequest } from '@/lib/editorial-auth';
import { ingestAssetRequests } from '@/lib/asset-intake';

export const dynamic = 'force-dynamic';

/**
 * Run the image intake immediately rather than waiting for the hourly cron.
 *
 * An agent that has just asked for a picture should not have to wait an hour
 * to use it. Same bearer credential as the other editorial routes.
 */
export async function POST(request: Request) {
  const auth = await verifyEditorialRequest(request);
  if (auth === 'unconfigured')
    return NextResponse.json(
      { error: 'Editorial automation is not configured' },
      { status: 503 },
    );
  if (auth !== 'authorized')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await ingestAssetRequests(8);
  return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } });
}
