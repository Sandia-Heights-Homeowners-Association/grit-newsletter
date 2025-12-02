import { NextRequest, NextResponse } from 'next/server';
import { getCategoryStats, getNewsletterCompletion, getContributorNames } from '@/lib/store';
import { getCurrentMonthKey, getPreviousMonthKey } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const currentMonth = getCurrentMonthKey();
    const previousMonth = getPreviousMonthKey();
    
    const currentStats = await getCategoryStats(currentMonth);
    const currentCompletion = await getNewsletterCompletion(currentMonth);
    const currentContributors = await getContributorNames(currentMonth);
    
    const previousStats = await getCategoryStats(previousMonth);
    const previousContributors = await getContributorNames(previousMonth);

    return NextResponse.json({ 
      currentStats,
      currentCompletion,
      currentContributors,
      currentMonth,
      previousStats,
      previousContributors,
      previousMonth
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
