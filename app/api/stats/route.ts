import { NextRequest, NextResponse } from 'next/server';
import { getCategoryStats, getContributorNames, getRoutineAndCommitteeCount, getDeadlineDay, reloadData } from '@/lib/store';
import { getCurrentMonthKey, getPreviousMonthKey, getNextPublicationInfo } from '@/lib/constants';

// Disable caching for this dynamic stats endpoint
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Explicitly reload data from blob to ensure fresh stats
    await reloadData();
    
    const deadlineDay = await getDeadlineDay();
    const currentMonth = getCurrentMonthKey(deadlineDay);
    const previousMonth = getPreviousMonthKey(deadlineDay);
    const deadlineInfo = getNextPublicationInfo(deadlineDay);
    
    const currentStats = await getCategoryStats(currentMonth);
    const currentContributors = await getContributorNames(currentMonth);
    const currentRoutineCommitteeCount = await getRoutineAndCommitteeCount(currentMonth);
    
    const previousStats = await getCategoryStats(previousMonth);
    const previousContributors = await getContributorNames(previousMonth);
    const previousRoutineCommitteeCount = await getRoutineAndCommitteeCount(previousMonth);

    return NextResponse.json({ 
      currentStats,
      currentContributors,
      currentMonth,
      currentRoutineCommitteeCount,
      previousStats,
      previousContributors,
      previousMonth,
      previousRoutineCommitteeCount,
      deadlineInfo
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
