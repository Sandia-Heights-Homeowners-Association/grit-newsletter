import { Submission, SubmissionCategory } from './types';
import { COMMUNITY_CATEGORIES, ROUTINE_CATEGORIES, COMMITTEE_CATEGORIES } from './types';
import { getCurrentMonthKey } from './constants';
import { put, list, del, head } from '@vercel/blob';

// Blob storage keys
const SUBMISSIONS_BLOB = 'submissions.json';

// In-memory cache
let submissions: Submission[] = [];
let isInitialized = false;

// Load data from Vercel Blob
async function loadSubmissions(): Promise<Submission[]> {
  try {
    // Use list to find the exact blob
    const { blobs } = await list({ prefix: SUBMISSIONS_BLOB });
    console.log('Loading submissions, found blobs:', blobs.length, blobs.map(b => b.pathname));
    
    // Find the exact match (not just prefix match)
    const exactBlob = blobs.find(b => b.pathname === SUBMISSIONS_BLOB);
    if (exactBlob) {
      console.log('Fetching blob from:', exactBlob.url);
      
      // Simple fetch - the blob is public
      const response = await fetch(exactBlob.url);
      
      if (!response.ok) {
        console.error('Fetch failed:', response.status, response.statusText);
        return [];
      }
      
      const data = await response.json();
      console.log('Loaded submissions:', data.length);
      
      if (!Array.isArray(data)) {
        console.error('Data is not an array:', typeof data);
        return [];
      }
      
      // Convert date strings back to Date objects
      return data.map((s: any) => ({
        ...s,
        submittedAt: new Date(s.submittedAt),
      }));
    }
    console.log('No submission blob found with exact name:', SUBMISSIONS_BLOB);
  } catch (error) {
    console.error('Error loading submissions from blob:', error);
  }
  return [];
}



async function saveSubmissions(submissions: Submission[]): Promise<void> {
  try {
    console.log('Saving submissions to blob. Count:', submissions.length);
    
    // Check if blob token is available
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN is not set!');
      throw new Error('Blob storage not configured');
    }
    
    // Delete old blobs with this name first
    try {
      const { blobs } = await list({ prefix: SUBMISSIONS_BLOB });
      for (const blob of blobs) {
        if (blob.pathname === SUBMISSIONS_BLOB || blob.pathname.startsWith(SUBMISSIONS_BLOB)) {
          await del(blob.url);
          console.log('Deleted old blob:', blob.pathname);
        }
      }
    } catch (delError) {
      console.log('No old blobs to delete or error deleting:', delError);
    }
    
    const jsonData = JSON.stringify(submissions, null, 2);
    console.log('JSON data size:', jsonData.length, 'bytes');
    
    const result = await put(SUBMISSIONS_BLOB, jsonData, {
      access: 'public',
      contentType: 'application/json',
    });
    
    console.log('Successfully saved submissions to blob:', result.url);
  } catch (error: any) {
    console.error('Error saving submissions to blob:', error);
    console.error('Error message:', error.message);
    throw error; // Re-throw to alert calling code
  }
}



// Initialize data
async function initializeData(): Promise<void> {
  if (!isInitialized) {
    submissions = await loadSubmissions();
    isInitialized = true;
    console.log('Data initialized:', { submissions: submissions.length });
  }
}

// Ensure data is loaded before any operation
async function ensureInitialized(): Promise<void> {
  if (!isInitialized) {
    await initializeData();
  }
}

// Reload data from blob (useful for refreshing in-memory cache)
export async function reloadData(): Promise<void> {
  submissions = await loadSubmissions();
  isInitialized = true;
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
  await ensureInitialized();
  
  console.log('Adding submission:', { category, contentLength: content.length, publishedName });
  
  const submission: Submission = {
    id: generateId(),
    category,
    content,
    submittedAt: new Date(),
    disposition: undefined, // Unreviewed until editor accepts for a month
    month: getCurrentMonthKey(),
    publishedName,
  };
  
  submissions.push(submission);
  console.log('Submission added to array. Total submissions:', submissions.length);
  
  try {
    await saveSubmissions(submissions);
    console.log('Submission saved successfully');
  } catch (error) {
    // Remove the submission if save failed
    submissions.pop();
    console.error('Failed to save submission, rolled back');
    throw error;
  }
  
  return submission;
}

// Get all submissions for a specific month
export async function getSubmissionsByMonth(month: string): Promise<Submission[]> {
  await ensureInitialized();
  
  const routineAndCommitteeCategories: SubmissionCategory[] = [
    ...ROUTINE_CATEGORIES,
    ...COMMITTEE_CATEGORIES,
  ];
  
  // Include all submissions for the specified month
  // PLUS all routine/committee submissions regardless of month (since they're evergreen content)
  return submissions.filter(s => 
    s.month === month || 
    routineAndCommitteeCategories.includes(s.category)
  );
}

// Get submissions by category and month
export async function getSubmissionsByCategory(
  category: SubmissionCategory,
  month: string
): Promise<Submission[]> {
  await ensureInitialized();
  return submissions.filter(s => s.category === category && s.month === month);
}

// Update submission disposition
export async function updateSubmissionDisposition(
  id: string,
  disposition: string
): Promise<Submission | null> {
  await ensureInitialized();
  
  const submission = submissions.find(s => s.id === id);
  if (submission) {
    submission.disposition = disposition;
    await saveSubmissions(submissions);
    return submission;
  }
  return null;
}

// Get category statistics
export async function getCategoryStats(month: string): Promise<Record<string, number>> {
  await ensureInitialized();
  
  const stats: Record<string, number> = {};
  
  const allCategories = [
    ...COMMUNITY_CATEGORIES,
    ...ROUTINE_CATEGORIES,
    ...COMMITTEE_CATEGORIES,
  ];
  
  allCategories.forEach(category => {
    stats[category] = submissions.filter(
      s => s.category === category && s.month === month
    ).length;
  });
  
  return stats;
}

// Get total count of routine and committee submissions
export async function getRoutineAndCommitteeCount(month: string): Promise<number> {
  await ensureInitialized();
  
  const routineAndCommitteeCategories: SubmissionCategory[] = [
    ...ROUTINE_CATEGORIES,
    ...COMMITTEE_CATEGORIES,
  ];
  
  return submissions.filter(
    s => routineAndCommitteeCategories.includes(s.category) && s.month === month
  ).length;
}



// Get backlogged submissions
export async function getBackloggedSubmissions(
  category: SubmissionCategory,
  currentMonth: string
): Promise<Submission[]> {
  await ensureInitialized();
  
  return submissions.filter(
    s => s.category === category && 
        s.disposition === 'backlog'
  );
}

// Get archived submissions for a category
export async function getArchivedSubmissions(
  category: SubmissionCategory
): Promise<Submission[]> {
  await ensureInitialized();
  
  return submissions.filter(
    s => s.category === category && s.disposition === 'archived'
  );
}

// Delete a submission permanently
export async function deleteSubmission(id: string): Promise<boolean> {
  await ensureInitialized();
  
  console.log('Attempting to delete submission:', id);
  console.log('Current submissions count:', submissions.length);
  
  const index = submissions.findIndex(s => s.id === id);
  if (index !== -1) {
    console.log('Found submission at index:', index);
    submissions.splice(index, 1);
    await saveSubmissions(submissions);
    console.log('Deleted submission. New count:', submissions.length);
    return true;
  }
  console.log('Submission not found with id:', id);
  return false;
}

// Get submission counts for a category (accepted for month, backlogged, archived)
export async function getCategorySubmissionCounts(
  category: SubmissionCategory,
  currentMonth: string
): Promise<{ accepted: number; backlog: number; archived: number }> {
  await ensureInitialized();
  
  const categorySubs = submissions.filter(s => s.category === category);
  
  return {
    accepted: categorySubs.filter(s => s.disposition === currentMonth).length,
    backlog: categorySubs.filter(s => s.disposition === 'backlog').length,
    archived: categorySubs.filter(s => s.disposition === 'archived').length,
  };
}

// Export all submissions for a month as text
export async function exportNewsletterText(month: string): Promise<string> {
  await ensureInitialized();
  
  const allCategories: SubmissionCategory[] = [
    ...COMMUNITY_CATEGORIES,
    ...ROUTINE_CATEGORIES,
    ...COMMITTEE_CATEGORIES,
  ];
  
  let output = '';
  
  for (const category of allCategories) {
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
  await ensureInitialized();
  return [...submissions];
}



// Get list of contributor names for current month
export async function getContributorNames(month: string): Promise<string[]> {
  await ensureInitialized();
  
  const contributors = submissions
    .filter(s => s.month === month && s.publishedName)
    .map(s => s.publishedName!)
    .filter((name, index, self) => self.indexOf(name) === index) // unique names
    .sort();
  
  return contributors;
}
