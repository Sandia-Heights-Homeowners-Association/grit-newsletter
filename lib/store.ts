import { Submission, SectionProgress, SubmissionCategory, DispositionStatus } from './types';
import { COMMUNITY_CATEGORIES, ROUTINE_CATEGORIES, COMMITTEE_CATEGORIES } from './types';
import { getCurrentMonthKey } from './constants';
import { put, list, del } from '@vercel/blob';

// Blob storage keys
const SUBMISSIONS_BLOB = 'submissions.json';
const PROGRESS_BLOB = 'section-progress.json';

// In-memory cache
let submissions: Submission[] = [];
let sectionProgress: Map<string, SectionProgress[]> = new Map();
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
      const response = await fetch(exactBlob.url);
      const data = await response.json();
      console.log('Loaded submissions:', data.length);
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

async function loadSectionProgress(): Promise<Map<string, SectionProgress[]>> {
  try {
    const { blobs } = await list({ prefix: PROGRESS_BLOB });
    console.log('Loading section progress, found blobs:', blobs.length, blobs.map(b => b.pathname));
    
    // Find the exact match (not just prefix match)
    const exactBlob = blobs.find(b => b.pathname === PROGRESS_BLOB);
    if (exactBlob) {
      const response = await fetch(exactBlob.url);
      const data = await response.json();
      console.log('Loaded section progress entries:', Object.keys(data).length);
      return new Map(Object.entries(data));
    }
    console.log('No progress blob found with exact name:', PROGRESS_BLOB);
  } catch (error) {
    console.error('Error loading section progress from blob:', error);
  }
  return new Map();
}

async function saveSubmissions(submissions: Submission[]): Promise<void> {
  try {
    console.log('Saving submissions to blob. Count:', submissions.length);
    
    // Check if blob token is available
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN is not set!');
      throw new Error('Blob storage not configured');
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

async function saveSectionProgress(progress: Map<string, SectionProgress[]>): Promise<void> {
  try {
    const obj = Object.fromEntries(progress);
    const jsonData = JSON.stringify(obj, null, 2);
    await put(PROGRESS_BLOB, jsonData, {
      access: 'public',
      contentType: 'application/json',
    });
  } catch (error) {
    console.error('Error saving section progress to blob:', error);
  }
}

// Initialize data
async function initializeData(): Promise<void> {
  if (!isInitialized) {
    submissions = await loadSubmissions();
    sectionProgress = await loadSectionProgress();
    isInitialized = true;
    console.log('Data initialized:', { submissions: submissions.length, progress: sectionProgress.size });
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
  sectionProgress = await loadSectionProgress();
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
    disposition: 'published',
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
  return submissions.filter(s => s.month === month);
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
  disposition: DispositionStatus
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

// Initialize section progress for a month
function initializeSectionProgress(month: string): SectionProgress[] {
  const allCategories: SubmissionCategory[] = [
    ...COMMUNITY_CATEGORIES,
    ...ROUTINE_CATEGORIES,
    ...COMMITTEE_CATEGORIES,
  ];
  
  return allCategories.map(category => ({
    category,
    isComplete: false,
  }));
}

// Get section progress for a month
export async function getSectionProgress(month: string): Promise<SectionProgress[]> {
  if (!sectionProgress.has(month)) {
    sectionProgress.set(month, initializeSectionProgress(month));
    await saveSectionProgress(sectionProgress);
  }
  return sectionProgress.get(month)!;
}

// Update section progress
export async function updateSectionProgress(
  month: string,
  category: SubmissionCategory,
  isComplete: boolean,
  editedContent?: string
): Promise<void> {
  const progress = await getSectionProgress(month);
  const section = progress.find(s => s.category === category);
  
  if (section) {
    section.isComplete = isComplete;
    section.editedContent = editedContent;
    await saveSectionProgress(sectionProgress);
  }
}

// Calculate overall newsletter completion percentage
export async function getNewsletterCompletion(month: string): Promise<number> {
  const progress = await getSectionProgress(month);
  const completed = progress.filter(s => s.isComplete).length;
  return Math.round((completed / progress.length) * 100);
}

// Get backlogged submissions (from previous months)
export async function getBackloggedSubmissions(
  category: SubmissionCategory,
  currentMonth: string
): Promise<Submission[]> {
  await ensureInitialized();
  
  return submissions.filter(
    s => s.category === category && 
        s.disposition === 'backlogged' && 
        s.month !== currentMonth
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

// Get submission counts for a category (published, backlogged, archived)
export async function getCategorySubmissionCounts(
  category: SubmissionCategory,
  currentMonth: string
): Promise<{ published: number; backlogged: number; archived: number }> {
  await ensureInitialized();
  
  const categorySubs = submissions.filter(s => s.category === category);
  const currentMonthSubs = categorySubs.filter(s => s.month === currentMonth);
  
  return {
    published: currentMonthSubs.filter(s => s.disposition === 'published').length,
    backlogged: categorySubs.filter(s => s.disposition === 'backlogged').length,
    archived: categorySubs.filter(s => s.disposition === 'archived').length,
  };
}

// Export all submissions for a month as text
export async function exportNewsletterText(month: string): Promise<string> {
  const progress = await getSectionProgress(month);
  let output = '';
  
  progress.forEach(async (section) => {
    if (section.isComplete) {
      output += `\n${'='.repeat(60)}\n`;
      output += `${section.category.toUpperCase()}\n`;
      output += `${'='.repeat(60)}\n\n`;
      
      if (section.editedContent) {
        output += section.editedContent;
      } else {
        const subs = await getSubmissionsByCategory(section.category, month);
        const published = subs.filter(s => s.disposition === 'published');
        published.forEach((sub, idx) => {
          if (idx > 0) output += '\n\n---\n\n';
          output += sub.content;
        });
      }
      
      output += '\n\n';
    }
  });
  
  return output;
}

// Get all data (for API endpoints)
export async function getAllSubmissions(): Promise<Submission[]> {
  await ensureInitialized();
  return [...submissions];
}

export async function getAllSectionProgress(): Promise<Map<string, SectionProgress[]>> {
  await ensureInitialized();
  return sectionProgress;
}

// Get list of contributor names for current month
export async function getContributorNames(month: string): Promise<string[]> {
  await ensureInitialized();
  
  const contributors = submissions
    .filter(s => s.month === month && s.publishedName && s.disposition === 'published')
    .map(s => s.publishedName!)
    .filter((name, index, self) => self.indexOf(name) === index) // unique names
    .sort();
  
  return contributors;
}
