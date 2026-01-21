import { Submission, SubmissionCategory } from './types';
import { COMMUNITY_CATEGORIES, ROUTINE_CATEGORIES, COMMITTEE_CATEGORIES } from './types';
import { getCurrentMonthKey } from './constants';
import { db, initializeDatabase } from './db';

// Deadline caching to reduce database reads
let cachedDeadlineDay: number | null = null;
let deadlineCacheTime: number = 0;
const DEADLINE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Initialize database on first use
let isDbInitialized = false;

async function ensureDbInitialized() {
  if (!isDbInitialized) {
    await initializeDatabase();
    isDbInitialized = true;
  }
}

// Load deadline from database with caching
export async function getDeadlineDay(): Promise<number> {
  await ensureDbInitialized();
  
  // Return cached value if still fresh
  const now = Date.now();
  if (cachedDeadlineDay !== null && (now - deadlineCacheTime) < DEADLINE_CACHE_DURATION) {
    return cachedDeadlineDay;
  }

  try {
    const deadlineDay = await db.getDeadlineDay();
    
    // Update cache
    cachedDeadlineDay = deadlineDay;
    deadlineCacheTime = now;
    
    return deadlineDay;
  } catch (error) {
    console.error('Error loading deadline from database:', error);
    // Default fallback
    const defaultDeadline = 20;
    cachedDeadlineDay = defaultDeadline;
    deadlineCacheTime = now;
    return defaultDeadline;
  }
}

// Set deadline day
export async function setDeadlineDay(day: number): Promise<void> {
  await ensureDbInitialized();
  await db.setDeadlineDay(day);
  
  // Clear cache
  cachedDeadlineDay = null;
  deadlineCacheTime = 0;
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Add a new submission
export async function addSubmission(
  category: SubmissionCategory,
  content: string,
  publishedName?: string
): Promise<Submission> {
  await ensureDbInitialized();
  
  // Load deadline to calculate correct month
  const deadlineDay = await getDeadlineDay();
  const monthKey = getCurrentMonthKey(deadlineDay);
  
  console.log('Adding submission:', { category, contentLength: content.length, publishedName, monthKey, deadlineDay });
  
  const submission: Submission = {
    id: generateId(),
    category,
    content,
    submittedAt: new Date(),
    disposition: undefined, // Unreviewed until editor accepts for a month
    month: monthKey,
    publishedName,
  };
  
  await db.insertSubmission(submission);
  console.log('Submission saved successfully');
  
  return submission;
}

// Get all submissions for a specific month
export async function getSubmissionsByMonth(month: string): Promise<Submission[]> {
  await ensureDbInitialized();
  
  const routineAndCommitteeCategories: SubmissionCategory[] = [
    ...ROUTINE_CATEGORIES,
    ...COMMITTEE_CATEGORIES,
  ];
  
  // Get all submissions from database
  const allSubmissions = await db.getAllSubmissions();
  
  // Include all submissions for the specified month
  // PLUS all routine/committee submissions regardless of month (since they're evergreen content)
  return allSubmissions.filter(s => 
    s.month === month || 
    routineAndCommitteeCategories.includes(s.category)
  );
}

// Get submissions by category and month
export async function getSubmissionsByCategory(
  category: SubmissionCategory,
  month: string
): Promise<Submission[]> {
  await ensureDbInitialized();
  return await db.getSubmissionsByCategory(category, month);
}

// Update submission disposition - ATOMIC
export async function updateSubmissionDisposition(
  id: string,
  disposition: string
): Promise<Submission | null> {
  await ensureDbInitialized();
  
  try {
    console.log('[UPDATE] Updating disposition:', { id, disposition });
    
    const updated = await db.updateSubmissionDisposition(id, disposition);
    
    if (!updated) {
      console.error('[UPDATE] Submission not found:', id);
      return null;
    }
    
    console.log('[UPDATE] Disposition updated successfully:', {
      id,
      newDisposition: updated.disposition
    });
    
    return updated;
  } catch (error) {
    console.error('[UPDATE] Error updating disposition:', error);
    throw error;
  }
}

// Save all submissions (batch update) - useful for bulk operations
export async function saveAllSubmissions(updatedSubmissions: Submission[]): Promise<boolean> {
  await ensureDbInitialized();
  
  try {
    // Extract disposition updates
    const updates = updatedSubmissions
      .filter(s => s.disposition)
      .map(s => ({ id: s.id, disposition: s.disposition! }));
    
    if (updates.length > 0) {
      await db.batchUpdateDispositions(updates);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to save all submissions:', error);
    return false;
  }
}

// Get category statistics
export async function getCategoryStats(month: string): Promise<Record<string, number>> {
  await ensureDbInitialized();
  
  const stats: Record<string, number> = {};
  const allCategories = [
    ...COMMUNITY_CATEGORIES,
    ...ROUTINE_CATEGORIES,
    ...COMMITTEE_CATEGORIES,
  ];
  
  // Get all submissions to calculate stats
  const allSubmissions = await db.getAllSubmissions();
  
  allCategories.forEach(category => {
    stats[category] = allSubmissions.filter(
      s => s.category === category && (
        // Explicitly assigned to this month
        s.disposition === month ||
        // Unreviewed items from this collection period
        (!s.disposition && s.month === month) ||
        // Legacy published items from this collection period
        (s.disposition === 'published' && s.month === month)
      )
    ).length;
  });
  
  return stats;
}

// Get total count of routine and committee submissions
export async function getRoutineAndCommitteeCount(month: string): Promise<number> {
  await ensureDbInitialized();
  
  const routineAndCommitteeCategories: SubmissionCategory[] = [
    ...ROUTINE_CATEGORIES,
    ...COMMITTEE_CATEGORIES,
  ];
  
  const allSubmissions = await db.getAllSubmissions();
  
  return allSubmissions.filter(
    s => routineAndCommitteeCategories.includes(s.category) && (
      // Explicitly assigned to this month
      s.disposition === month ||
      // Unreviewed items from this collection period
      (!s.disposition && s.month === month) ||
      // Legacy published items from this collection period
      (s.disposition === 'published' && s.month === month)
    )
  ).length;
}

// Get backlogged submissions
export async function getBackloggedSubmissions(
  category: SubmissionCategory,
  currentMonth: string
): Promise<Submission[]> {
  await ensureDbInitialized();
  
  const allSubmissions = await db.getAllSubmissions();
  
  return allSubmissions.filter(
    s => s.category === category && 
        s.disposition === 'backlog'
  );
}

// Get archived submissions for a category
export async function getArchivedSubmissions(
  category: SubmissionCategory
): Promise<Submission[]> {
  await ensureDbInitialized();
  
  const allSubmissions = await db.getAllSubmissions();
  
  return allSubmissions.filter(
    s => s.category === category && s.disposition === 'archived'
  );
}

// Delete a submission permanently
export async function deleteSubmission(id: string): Promise<boolean> {
  await ensureDbInitialized();
  
  console.log('Attempting to delete submission:', id);
  
  const deleted = await db.deleteSubmission(id);
  
  if (deleted) {
    console.log('Successfully deleted submission:', id);
  } else {
    console.log('Submission not found with id:', id);
  }
  
  return deleted;
}

// Get submission counts for a category (accepted for month, backlogged, archived)
export async function getCategorySubmissionCounts(
  category: SubmissionCategory,
  currentMonth: string
): Promise<{ accepted: number; backlog: number; archived: number }> {
  await ensureDbInitialized();
  
  const allSubmissions = await db.getAllSubmissions();
  const categorySubs = allSubmissions.filter(s => s.category === category);
  
  return {
    accepted: categorySubs.filter(s => s.disposition === currentMonth).length,
    backlog: categorySubs.filter(s => s.disposition === 'backlog').length,
    archived: categorySubs.filter(s => s.disposition === 'archived').length,
  };
}

// Export all submissions for a month as text
export async function exportNewsletterText(month: string): Promise<string> {
  await ensureDbInitialized();
  
  // Define category order matching the newsletter structure:
  // 1. President's note
  // 2. Board Notes
  // 3. Office Notes
  // 4. Association Events
  // 5-6. Committee: The Board, General Announcements
  // 7. Other Committee Content
  // 8. Community Contributions (Classifieds, Lost & Found last)
  // 9. End material: ACC Activity Log, CSC Table, Security Report
  
  const orderedCategories: SubmissionCategory[] = [
    // 1-4: Main routine content
    'President\'s Note',
    'Board Notes',
    'Office Notes',
    'Association Events',
    
    // 5-7: Committee content (special ones first)
    'The Board',
    'General Announcements',
    ...COMMITTEE_CATEGORIES.filter(cat => cat !== 'The Board' && cat !== 'General Announcements'),
    
    // 8: Community contributions (Classifieds and Lost & Found last)
    ...COMMUNITY_CATEGORIES.filter(cat => cat !== 'Classifieds' && cat !== 'Lost & Found'),
    'Classifieds',
    'Lost & Found',
    
    // 9: End material
    'ACC Activity Log',
    'CSC Table',
    'Security Report',
  ];
  
  let output = '';
  
  for (const category of orderedCategories) {
    const subs = await getSubmissionsByCategory(category, month);
    const accepted = subs.filter(s => s.disposition === month);
    
    if (accepted.length > 0) {
      output += `\n${'='.repeat(60)}\n`;
      output += `${category.toUpperCase()}\n`;
      output += `${'='.repeat(60)}\n\n`;
      
      accepted.forEach((sub, idx) => {
        if (idx > 0) output += '\n\n---\n\n';
        output += sub.content;
      });
      
      output += '\n\n';
    }
  }
  
  return output;
}

// Get all data (for API endpoints)
export async function getAllSubmissions(): Promise<Submission[]> {
  await ensureDbInitialized();
  return await db.getAllSubmissions();
}

// Get list of contributor names for current month
export async function getContributorNames(month: string): Promise<string[]> {
  await ensureDbInitialized();
  
  const allSubmissions = await db.getAllSubmissions();
  
  const contributors = allSubmissions
    .filter(s => (
      // Explicitly assigned to this month
      s.disposition === month ||
      // Unreviewed items from this collection period
      (!s.disposition && s.month === month) ||
      // Legacy published items from this collection period
      (s.disposition === 'published' && s.month === month)
    ) && s.publishedName)
    .map(s => s.publishedName!)
    .filter((name, index, self) => self.indexOf(name) === index) // unique names
    .sort();
  
  return contributors;
}

// Reload data - now a no-op since we always read from DB
export async function reloadData(): Promise<void> {
  await ensureDbInitialized();
  // No-op - database is always fresh
  console.log('reloadData called - database is always current');
}
