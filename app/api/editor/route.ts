import { NextRequest, NextResponse } from 'next/server';
import { 
  getSubmissionsByMonth,
  getSectionProgress,
  getBackloggedSubmissions,
  updateSubmissionDisposition,
  updateSectionProgress,
  exportNewsletterText,
  getSubmissionsByCategory
} from '@/lib/store';
import { getCurrentMonthKey, EDITOR_PASSWORD } from '@/lib/constants';
import type { SubmissionCategory, DispositionStatus } from '@/lib/types';

// Verify editor password
function verifyPassword(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  
  const password = authHeader.replace('Bearer ', '');
  return password === EDITOR_PASSWORD;
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
    const month = getCurrentMonthKey();
    const submissions = getSubmissionsByMonth(month);
    const progress = getSectionProgress(month);

    console.log('Editor GET:', { month, submissions: submissions.length, progress: progress.length });

    return NextResponse.json({ 
      submissions,
      progress,
      month
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
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'updateDisposition':
        const { submissionId, disposition } = data;
        const updated = updateSubmissionDisposition(submissionId, disposition as DispositionStatus);
        return NextResponse.json({ success: true, submission: updated });

      case 'updateSection':
        const { category, isComplete, editedContent } = data;
        const month = getCurrentMonthKey();
        updateSectionProgress(month, category as SubmissionCategory, isComplete, editedContent);
        return NextResponse.json({ success: true });

      case 'getBacklog':
        const { category: cat } = data;
        const month2 = getCurrentMonthKey();
        const backlog = getBackloggedSubmissions(cat as SubmissionCategory, month2);
        return NextResponse.json({ backlog });

      case 'getCategorySubmissions':
        const { category: category3 } = data;
        const month3 = getCurrentMonthKey();
        const subs = getSubmissionsByCategory(category3 as SubmissionCategory, month3);
        return NextResponse.json({ submissions: subs });

      case 'export':
        const exportMonth = getCurrentMonthKey();
        const text = exportNewsletterText(exportMonth);
        return NextResponse.json({ text });

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
