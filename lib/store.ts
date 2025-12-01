import { Submission, SectionProgress, SubmissionCategory, DispositionStatus } from './types';
import { COMMUNITY_CATEGORIES, ROUTINE_CATEGORIES, COMMITTEE_CATEGORIES } from './types';
import { getCurrentMonthKey } from './constants';
import fs from 'fs';
import path from 'path';

// Data directory for file storage
const DATA_DIR = path.join(process.cwd(), 'data');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const PROGRESS_FILE = path.join(DATA_DIR, 'section-progress.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load data from files
function loadSubmissions(): Submission[] {
  try {
    if (fs.existsSync(SUBMISSIONS_FILE)) {
      const data = fs.readFileSync(SUBMISSIONS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      // Convert date strings back to Date objects
      return parsed.map((s: any) => ({
        ...s,
        submittedAt: new Date(s.submittedAt),
      }));
    }
  } catch (error) {
    console.error('Error loading submissions:', error);
  }
  return [];
}

function loadSectionProgress(): Map<string, SectionProgress[]> {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return new Map(Object.entries(parsed));
    }
  } catch (error) {
    console.error('Error loading section progress:', error);
  }
  return new Map();
}

function saveSubmissions(submissions: Submission[]): void {
  try {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving submissions:', error);
  }
}

function saveSectionProgress(progress: Map<string, SectionProgress[]>): void {
  try {
    const obj = Object.fromEntries(progress);
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving section progress:', error);
  }
}

// File-based data store
let submissions: Submission[] = loadSubmissions();
let sectionProgress: Map<string, SectionProgress[]> = loadSectionProgress();

// Reload data from disk (useful for refreshing in-memory cache)
export function reloadData(): void {
  submissions = loadSubmissions();
  sectionProgress = loadSectionProgress();
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Add a new submission
export function addSubmission(
  category: SubmissionCategory,
  content: string,
  publishedName?: string
): Submission {
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
  saveSubmissions(submissions);
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
export function updateSubmissionDisposition(
  id: string,
  disposition: DispositionStatus
): Submission | null {
  const submission = submissions.find(s => s.id === id);
  if (submission) {
    submission.disposition = disposition;
    saveSubmissions(submissions);
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
export function getSectionProgress(month: string): SectionProgress[] {
  if (!sectionProgress.has(month)) {
    sectionProgress.set(month, initializeSectionProgress(month));
    saveSectionProgress(sectionProgress);
  }
  return sectionProgress.get(month)!;
}

// Update section progress
export function updateSectionProgress(
  month: string,
  category: SubmissionCategory,
  isComplete: boolean,
  editedContent?: string
): void {
  const progress = getSectionProgress(month);
  const section = progress.find(s => s.category === category);
  
  if (section) {
    section.isComplete = isComplete;
    section.editedContent = editedContent;
    saveSectionProgress(sectionProgress);
  }
}

// Calculate overall newsletter completion percentage
export function getNewsletterCompletion(month: string): number {
  const progress = getSectionProgress(month);
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
export function exportNewsletterText(month: string): string {
  const progress = getSectionProgress(month);
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
