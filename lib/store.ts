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

// Load data from Vercel Blob
async function loadSubmissions(): Promise<Submission[]> {
  try {
    const { blobs } = await list({ prefix: SUBMISSIONS_BLOB });
    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url);
      const data = await response.json();
      // Convert date strings back to Date objects
      return data.map((s: any) => ({
        ...s,
        submittedAt: new Date(s.submittedAt),
      }));
    }
  } catch (error) {
    console.error('Error loading submissions from blob:', error);
  }
  return [];
}

async function loadSectionProgress(): Promise<Map<string, SectionProgress[]>> {
  try {
    const { blobs } = await list({ prefix: PROGRESS_BLOB });
    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url);
      const data = await response.json();
      return new Map(Object.entries(data));
    }
  } catch (error) {
    console.error('Error loading section progress from blob:', error);
  }
  return new Map();
}

async function saveSubmissions(submissions: Submission[]): Promise<void> {
  try {
    const jsonData = JSON.stringify(submissions, null, 2);
    await put(SUBMISSIONS_BLOB, jsonData, {
      access: 'public',
      contentType: 'application/json',
    });
  } catch (error) {
    console.error('Error saving submissions to blob:', error);
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

// Initialize data on module load
(async () => {
  submissions = await loadSubmissions();
  sectionProgress = await loadSectionProgress();
})();

// Reload data from blob (useful for refreshing in-memory cache)
export async function reloadData(): Promise<void> {
  submissions = await loadSubmissions();
  sectionProgress = await loadSectionProgress();
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
  await saveSubmissions(submissions);
  return submission;
}

// Get all submissions for a specific month
export function getSubmissionsByMonth(month: string): Submission[] {
  return submissions.filter(s => s.month === month);
}

// Get submissions by category and month
export function getSubmissionsByCategory(
  category: SubmissionCategory,
  month: string
): Submission[] {
  return submissions.filter(s => s.category === category && s.month === month);
}

// Update submission disposition
export async function updateSubmissionDisposition(
  id: string,
  disposition: DispositionStatus
): Promise<Submission | null> {
  const submission = submissions.find(s => s.id === id);
  if (submission) {
    submission.disposition = disposition;
    await saveSubmissions(submissions);
    return submission;
  }
  return null;
}

// Get category statistics
export function getCategoryStats(month: string): Record<string, number> {
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
export function getBackloggedSubmissions(
  category: SubmissionCategory,
  currentMonth: string
): Submission[] {
  return submissions.filter(
    s => s.category === category && 
        s.disposition === 'backlogged' && 
        s.month !== currentMonth
  );
}

// Export all submissions for a month as text
export async function exportNewsletterText(month: string): Promise<string> {
  const progress = await getSectionProgress(month);
  let output = '';
  
  progress.forEach(section => {
    if (section.isComplete) {
      output += `\n${'='.repeat(60)}\n`;
      output += `${section.category.toUpperCase()}\n`;
      output += `${'='.repeat(60)}\n\n`;
      
      if (section.editedContent) {
        output += section.editedContent;
      } else {
        const subs = getSubmissionsByCategory(section.category, month)
          .filter(s => s.disposition === 'published');
        subs.forEach((sub, idx) => {
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
export function getAllSubmissions(): Submission[] {
  return [...submissions];
}

export function getAllSectionProgress(): Map<string, SectionProgress[]> {
  return sectionProgress;
}

// Get list of contributor names for current month
export function getContributorNames(month: string): string[] {
  const contributors = submissions
    .filter(s => s.month === month && s.publishedName && s.disposition === 'published')
    .map(s => s.publishedName!)
    .filter((name, index, self) => self.indexOf(name) === index) // unique names
    .sort();
  
  return contributors;
}
