// Application constants
export const APP_NAME = 'The GRIT';
export const APP_SUBTITLE = 'Guiding Residents, Inspiring Togetherness';
export const SUBMISSION_DEADLINE_DAY = 10;

// Simple password protection (in production, use proper authentication)
export const EDITOR_PASSWORD = 'grit2025';
export const ROUTINE_PASSWORD = 'routine2025';
export const COMMITTEE_PASSWORD = 'committee2025';

// Helper to get next month's publication details
export function getNextPublicationInfo(): { month: string; deadline: string } {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const deadlineMonth = new Date(now.getFullYear(), now.getMonth(), SUBMISSION_DEADLINE_DAY);
  
  const monthName = nextMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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

// Format for storing months
export function getCurrentMonthKey(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
}
