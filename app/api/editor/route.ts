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
  getDeadlineDay,
  addPlaceholder
} from '@/lib/store';
import { getEditorMonthKey, getNextPublicationInfo, EDITOR_PASSWORD } from '@/lib/constants';
import { SubmissionCategory } from '@/lib/types';
import { setDeadlineDay } from '@/lib/store';
import { db } from '@/lib/db';
import { getCaptionEntryWindow, normalizeDateInput } from '@/lib/caption-contest';

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

function dismissedMissingItemsConfigKey(month: string): string {
  return `dismissed_missing_monthly_categories_${month}`;
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
    const month = requestedMonth || getEditorMonthKey();
    
    const submissions = await getSubmissionsByMonth(month);
    const deadlineInfo = getNextPublicationInfo(deadlineDay);
    const availableMonths = getAvailableMonths();
    const categoryOrder = await db.getConfig<string[]>('default_category_order');
    const defaultMonthlyCategories = await db.getConfig<string[]>('default_monthly_categories');
    const contentOrder = await db.getConfig<string[]>(`content_order_${month}`);
    const dismissedMissingCategories = await db.getConfig<string[]>(dismissedMissingItemsConfigKey(month));

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
      deadlineInfo,
      categoryOrder,
      defaultMonthlyCategories,
      contentOrder,
      dismissedMissingCategories,
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
    
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'saveAllSubmissions':
        const { submissions: allSubmissions } = data;
        const saved = await saveAllSubmissions(allSubmissions);
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
        return NextResponse.json({ success: true, submission: updated });

      case 'getBacklog':
        const { category: cat } = data;
        const month2 = getEditorMonthKey();
        const backlog = await getBackloggedSubmissions(cat as SubmissionCategory, month2);
        const archived = await getArchivedSubmissions(cat as SubmissionCategory);
        return NextResponse.json({ backlog, archived });

      case 'getCategorySubmissions':
        const { category: category3 } = data;
        const month3 = getEditorMonthKey();
        const subs = await getSubmissionsByCategory(category3 as SubmissionCategory, month3);
        return NextResponse.json({ submissions: subs });

      case 'getCategoryCounts':
        const { category: countCat } = data;
        const countMonth = getEditorMonthKey();
        const counts = await getCategorySubmissionCounts(countCat as SubmissionCategory, countMonth);
        return NextResponse.json({ counts });

      case 'deleteSubmission':
        const { submissionId: deleteId } = data;
        const deleted = await deleteSubmission(deleteId);
        // Invalidate cache to ensure fresh data on next read
        await reloadData();
        return NextResponse.json({ success: deleted });

      case 'export':
        const exportMonth = data.month || getEditorMonthKey();
        const text = await exportNewsletterText(exportMonth);
        return NextResponse.json({ text });

      case 'createPlaceholder': {
        const { category: placeholderCategory, title, notes, month, priority } = data;
        const targetMonth = month || getEditorMonthKey();

        if (!placeholderCategory || typeof title !== 'string' || title.trim().length === 0) {
          return NextResponse.json(
            { error: 'Category and title are required.' },
            { status: 400 }
          );
        }

        const placeholder = await addPlaceholder(
          placeholderCategory as SubmissionCategory,
          title,
          typeof notes === 'string' ? notes : '',
          targetMonth,
          priority === 'low' || priority === 'normal' || priority === 'high' ? priority : 'high'
        );

        return NextResponse.json({ success: true, submission: placeholder });
      }

      case 'updateDeadline':
        const { deadlineDay: newDeadlineDay } = data;
        if (typeof newDeadlineDay !== 'number' || newDeadlineDay < 1 || newDeadlineDay > 28) {
          return NextResponse.json(
            { error: 'Invalid deadline day. Must be between 1 and 28.' },
            { status: 400 }
          );
        }

        try {
          // Store the deadline in database
          await setDeadlineDay(newDeadlineDay);

          const updatedDeadlineInfo = getNextPublicationInfo(newDeadlineDay);
          
          return NextResponse.json({ 
            success: true, 
            deadlineDay: newDeadlineDay,
            deadlineInfo: updatedDeadlineInfo,
            message: 'Deadline updated successfully.'
          });
        } catch (err) {
          console.error('Failed to update deadline:', err);
          return NextResponse.json(
            { error: 'Failed to store deadline configuration' },
            { status: 500 }
          );
        }

      case 'updateDefaultCategoryOrder': {
        const { categoryOrder } = data;
        if (
          !Array.isArray(categoryOrder) ||
          categoryOrder.length === 0 ||
          !categoryOrder.every((category) => typeof category === 'string' && category.trim().length > 0)
        ) {
          return NextResponse.json(
            { error: 'Category order must be a non-empty list of category names.' },
            { status: 400 }
          );
        }

        const uniqueOrder = Array.from(new Set(categoryOrder.map((category) => category.trim())));
        await db.setConfig('default_category_order', uniqueOrder);
        return NextResponse.json({ success: true, categoryOrder: uniqueOrder });
      }

      case 'updateDefaultMonthlyItems': {
        const { defaultMonthlyCategories } = data;
        if (
          !Array.isArray(defaultMonthlyCategories) ||
          !defaultMonthlyCategories.every((category) => typeof category === 'string' && category.trim().length > 0)
        ) {
          return NextResponse.json(
            { error: 'Default monthly items must be a list of category names.' },
            { status: 400 }
          );
        }

        const uniqueCategories = Array.from(new Set(defaultMonthlyCategories.map((category) => category.trim())));
        await db.setConfig('default_monthly_categories', uniqueCategories);
        return NextResponse.json({ success: true, defaultMonthlyCategories: uniqueCategories });
      }

      case 'updateContentOrder': {
        const { month, orderedIds } = data;
        if (
          typeof month !== 'string' ||
          !/^\d{4}-\d{2}$/.test(month) ||
          !Array.isArray(orderedIds) ||
          !orderedIds.every((id) => typeof id === 'string' && id.trim().length > 0)
        ) {
          return NextResponse.json(
            { error: 'Content order requires a month and list of submission ids.' },
            { status: 400 }
          );
        }

        const uniqueIds = Array.from(new Set(orderedIds.map((id) => id.trim())));
        await db.setConfig(`content_order_${month}`, uniqueIds);
        return NextResponse.json({ success: true, month, orderedIds: uniqueIds });
      }

      case 'updateDismissedMissingItems': {
        const { month, dismissedMissingCategories } = data;
        if (
          typeof month !== 'string' ||
          !/^\d{4}-\d{2}$/.test(month) ||
          !Array.isArray(dismissedMissingCategories) ||
          !dismissedMissingCategories.every((category) => typeof category === 'string' && category.trim().length > 0)
        ) {
          return NextResponse.json(
            { error: 'Dismissed missing items require a month and list of category names.' },
            { status: 400 }
          );
        }

        const uniqueCategories = Array.from(new Set(dismissedMissingCategories.map((category) => category.trim())));
        await db.setConfig(dismissedMissingItemsConfigKey(month), uniqueCategories);
        return NextResponse.json({ success: true, month, dismissedMissingCategories: uniqueCategories });
      }

      case 'getCaptionContest':
        const contest = await db.getCaptionContest();
        const entryWindow = getCaptionEntryWindow(contest);
        const captions = await db.getCaptions(entryWindow);
        return NextResponse.json({ contest, captions, entryWindow });

      case 'setCaptionContest': {
        const { enabled, title: contestTitle, description: contestDesc, startDate, endDate } = data;
        const hasStartDate = Object.prototype.hasOwnProperty.call(data, 'startDate');
        const hasEndDate = Object.prototype.hasOwnProperty.call(data, 'endDate');
        const normalizedStartDate = hasStartDate ? normalizeDateInput(startDate) : undefined;
        const normalizedEndDate = hasEndDate ? normalizeDateInput(endDate) : undefined;
        if ((hasStartDate && startDate && !normalizedStartDate) || (hasEndDate && endDate && !normalizedEndDate)) {
          return NextResponse.json({ error: 'Contest dates must use YYYY-MM-DD format.' }, { status: 400 });
        }
        if (normalizedStartDate && normalizedEndDate && normalizedStartDate > normalizedEndDate) {
          return NextResponse.json({ error: 'Contest start date must be before the end date.' }, { status: 400 });
        }
        const contestUpdate: {
          enabled: boolean;
          title?: string | null;
          description?: string | null;
          startDate?: string | null;
          endDate?: string | null;
        } = {
          enabled,
          title: contestTitle,
          description: contestDesc,
        };
        if (hasStartDate) contestUpdate.startDate = normalizedStartDate;
        if (hasEndDate) contestUpdate.endDate = normalizedEndDate;
        await db.setCaptionContest(contestUpdate);
        const updatedContest = await db.getCaptionContest();
        const updatedWindow = getCaptionEntryWindow(updatedContest);
        const updatedCaptions = await db.getCaptions(updatedWindow);
        return NextResponse.json({
          success: true,
          contest: updatedContest,
          captions: updatedCaptions,
          entryWindow: updatedWindow,
        });
      }

      case 'setCaptionImage': {
        const { imageData, imageType } = data;
        if (!imageData || typeof imageData !== 'string') {
          return NextResponse.json({ error: 'Invalid image data' }, { status: 400 });
        }
        await db.setCaptionImage(imageData, imageType || 'image/jpeg');
        return NextResponse.json({ success: true });
      }

      case 'clearCaptionImage': {
        await db.clearCaptionImage();
        return NextResponse.json({ success: true });
      }

      case 'deleteCaption': {
        const { captionId } = data;
        if (!captionId) return NextResponse.json({ error: 'captionId required' }, { status: 400 });
        await db.deleteCaption(captionId);
        return NextResponse.json({ success: true });
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
