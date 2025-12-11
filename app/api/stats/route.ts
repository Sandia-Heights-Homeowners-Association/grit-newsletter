import { NextRequest, NextResponse } from 'next/server';
import { getCategoryStats, getContributorNames, getRoutineAndCommitteeCount } from '@/lib/store';
import { getCurrentMonthKey, getPreviousMonthKey, getNextPublicationInfo } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const currentMonth = getCurrentMonthKey();
    const previousMonth = getPreviousMonthKey();
    const deadlineInfo = getNextPublicationInfo();
    
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
