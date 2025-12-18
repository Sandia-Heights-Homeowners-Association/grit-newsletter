import { NextRequest, NextResponse } from 'next/server';
import { 
  getSubmissionsByMonth,
  getBackloggedSubmissions,
  getArchivedSubmissions,
  updateSubmissionDisposition,
  saveAllSubmissions,
  exportNewsletterText,
  getSubmissionsByCategory,
  deleteSubmission,
  getCategorySubmissionCounts,
  reloadData,
  getDeadlineDay
} from '@/lib/store';
import { getCurrentMonthKey, getNextPublicationInfo, EDITOR_PASSWORD } from '@/lib/constants';
import { SubmissionCategory } from '@/lib/types';
import { put, list, del } from '@vercel/blob';

// Verify editor password
function verifyPassword(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  
  const password = authHeader.replace('Bearer ', '');
  return password === EDITOR_PASSWORD;
}

// Helper to generate available months (current, next, and previous)
function getAvailableMonths(): Array<{key: string; label: string}> {
  const months: Array<{key: string; label: string}> = [];
  const now = new Date();
  
  // Generate 6 months: 2 past, current, 3 future
  for (let i = -2; i <= 3; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    const label = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    months.push({ key, label });
  }
  
  return months;
}

// GET - Get all editor data
export async function GET(request: NextRequest) {
  if (!verifyPassword(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Reload data from blob to ensure fresh data
    await reloadData();
    
    // Load deadline from blob
    const deadlineDay = await getDeadlineDay();
    
    // Check if a specific month is requested
    const { searchParams } = new URL(request.url);
    const requestedMonth = searchParams.get('month');
    const month = requestedMonth || getCurrentMonthKey(deadlineDay);
    
    const submissions = await getSubmissionsByMonth(month);
    const deadlineInfo = getNextPublicationInfo(deadlineDay);
    const availableMonths = getAvailableMonths();

    console.log('Editor GET:', { month, submissions: submissions.length });
    console.log('Submissions by category:', submissions.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>));

    return NextResponse.json({ 
      submissions,
      month,
      availableMonths,
      deadlineDay: deadlineDay,
      deadlineInfo
    });
  } catch (error) {
    console.error('Editor GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get editor data' },
      { status: 500 }
    );
  }
}

// POST - Update submissions and sections
export async function POST(request: NextRequest) {
  if (!verifyPassword(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Reload data from blob to ensure fresh data
    await reloadData();
    
    // Load deadline from blob
    const deadlineDay = await getDeadlineDay();
    
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'saveAllSubmissions':
        const { submissions: allSubmissions } = data;
        const saved = await saveAllSubmissions(allSubmissions);
        // Don't reload - in-memory cache is already correct
        // Reloading immediately after save creates race condition with blob propagation
        return NextResponse.json({ success: saved });

      case 'updateDisposition':
        const { submissionId, disposition } = data;
        const updated = await updateSubmissionDisposition(submissionId, disposition);
        if (!updated) {
          return NextResponse.json(
            { error: 'Submission not found' },
            { status: 404 }
          );
        }
        // Don't reload - in-memory cache is already correctly updated
        // Reloading creates race condition with blob propagation
        return NextResponse.json({ success: true, submission: updated });

      case 'getBacklog':
        const { category: cat } = data;
        const month2 = getCurrentMonthKey(deadlineDay);
        const backlog = await getBackloggedSubmissions(cat as SubmissionCategory, month2);
        const archived = await getArchivedSubmissions(cat as SubmissionCategory);
        return NextResponse.json({ backlog, archived });

      case 'getCategorySubmissions':
        const { category: category3 } = data;
        const month3 = getCurrentMonthKey(deadlineDay);
        const subs = await getSubmissionsByCategory(category3 as SubmissionCategory, month3);
        return NextResponse.json({ submissions: subs });

      case 'getCategoryCounts':
        const { category: countCat } = data;
        const countMonth = getCurrentMonthKey(deadlineDay);
        const counts = await getCategorySubmissionCounts(countCat as SubmissionCategory, countMonth);
        return NextResponse.json({ counts });

      case 'deleteSubmission':
        const { submissionId: deleteId } = data;
        const deleted = await deleteSubmission(deleteId);
        // Invalidate cache to ensure fresh data on next read
        await reloadData();
        return NextResponse.json({ success: deleted });

      case 'export':
        const exportMonth = getCurrentMonthKey(deadlineDay);
        const text = await exportNewsletterText(exportMonth);
        return NextResponse.json({ text });

      case 'updateDeadline':
        const { deadlineDay: newDeadlineDay } = data;
        if (typeof newDeadlineDay !== 'number' || newDeadlineDay < 1 || newDeadlineDay > 28) {
          return NextResponse.json(
            { error: 'Invalid deadline day. Must be between 1 and 28.' },
            { status: 400 }
          );
        }

        try {
          // Delete old deadline blob if it exists
          const { blobs } = await list({ prefix: 'config/deadline.json' });
          for (const blob of blobs) {
            if (blob.pathname === 'config/deadline.json') {
              await del(blob.url);
            }
          }
          
          // Store the deadline in Vercel Blob
          const deadlineBlob = await put('config/deadline.json', JSON.stringify({ deadlineDay: newDeadlineDay }), {
            access: 'public',
            addRandomSuffix: false,
          });

          const updatedDeadlineInfo = getNextPublicationInfo(newDeadlineDay);
          
          return NextResponse.json({ 
            success: true, 
            deadlineDay: newDeadlineDay,
            deadlineInfo: updatedDeadlineInfo,
            message: 'Deadline updated successfully. Note: You may need to reload pages to see the updated deadline.'
          });
        } catch (err) {
          console.error('Failed to update deadline:', err);
          return NextResponse.json(
            { error: 'Failed to store deadline configuration' },
            { status: 500 }
          );
        }

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Editor POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
