import { NextRequest, NextResponse } from 'next/server';
import { getCategoryStats, getNewsletterCompletion } from '@/lib/store';
import { getCurrentMonthKey } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const month = getCurrentMonthKey();
    const stats = getCategoryStats(month);
    const completion = getNewsletterCompletion(month);

    return NextResponse.json({ 
      stats,
      completion,
      month
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
