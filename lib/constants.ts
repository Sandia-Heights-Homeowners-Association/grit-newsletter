// Application constants
export const APP_NAME = 'The GRIT';
export const APP_SUBTITLE = 'Guiding Residents, Inspiring Togetherness';
export const SUBMISSION_DEADLINE_DAY = parseInt(process.env.NEXT_PUBLIC_SUBMISSION_DEADLINE_DAY || '10');

// Simple password protection (in production, use proper authentication)
export const EDITOR_PASSWORD = 'grit2025';
export const ROUTINE_PASSWORD = 'routine2025';
export const COMMITTEE_PASSWORD = 'committee2025';

// Helper to get next month's publication details
export function getNextPublicationInfo(): { month: string; deadline: string } {
  const now = new Date();
  const dayOfMonth = now.getDate();
  
  // If we're past the deadline, we're collecting for 2 months ahead
  // If we're before/on the deadline, we're collecting for next month
  const monthsAhead = dayOfMonth > SUBMISSION_DEADLINE_DAY ? 2 : 1;
  
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
  
  // Deadline is always the 10th of the month before the target
  const deadlineMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() - 1, SUBMISSION_DEADLINE_DAY);
  
  const monthName = targetMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const deadlineStr = deadlineMonth.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  return {
    month: monthName,
    deadline: deadlineStr,
  };
}

// Format for storing months - returns the month we're currently collecting for
export function getCurrentMonthKey(): string {
  const now = new Date();
  const dayOfMonth = now.getDate();
  
  // If we're past the deadline, we're collecting for 2 months ahead
  // If we're before/on the deadline, we're collecting for next month
  const monthsAhead = dayOfMonth > SUBMISSION_DEADLINE_DAY ? 2 : 1;
  
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
  return `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}`;
}

export function getPreviousMonthKey(): string {
  const now = new Date();
  const dayOfMonth = now.getDate();
  
  // Previous collection period is one month before current
  const monthsAhead = dayOfMonth > SUBMISSION_DEADLINE_DAY ? 1 : 0;
  
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
  return `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthName(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
