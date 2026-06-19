import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';

export async function GET() {
  return NextResponse.json(
    {
      turnstileSiteKey:
        process.env.TURNSTILE_SITE_KEY ||
        process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
        TURNSTILE_TEST_SITE_KEY,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
