// Application constants
import type { RoutineCategory } from './types';

export const APP_NAME = 'The GRIT';
export const APP_SUBTITLE = 'Guiding Residents, Inspiring Togetherness';

// Advisory limits for routine newsletter sections. These are intentionally not
// enforced so authors can still submit copy that needs editorial review.
export const ROUTINE_WORD_LIMITS: Partial<Record<RoutineCategory, number>> = {
  'President\'s Note': 300,
};

// Passwords from environment variables (server-side only)
export const EDITOR_PASSWORD = process.env.EDITOR_PASSWORD || '';

// Helper to get next month's publication details
export function getNextPublicationInfo(deadlineDay: number = 20): { month: string; deadline: string } {
  const now = new Date();
  const dayOfMonth = now.getDate();
  
  // If we're after the deadline (day after), we're collecting for 2 months ahead
  // If we're on or before the deadline, we're collecting for next month
  const monthsAhead = dayOfMonth > deadlineDay ? 2 : 1;
  
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
  
  // Deadline is on the configured day of the month before the target
  const deadlineMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() - 1, deadlineDay);
  
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
export function getCurrentMonthKey(deadlineDay: number = 20): string {
  const now = new Date();
  const dayOfMonth = now.getDate();
  
  // If we're after the deadline (day after), we're collecting for 2 months ahead
  // If we're on or before the deadline, we're collecting for next month
  const monthsAhead = dayOfMonth > deadlineDay ? 2 : 1;
  
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
  return `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}`;
}

// Editor planning defaults to the next issue still being assembled.
// Public submissions may already be collecting for the following issue after
// deadline day, but editors usually keep laying out next month's issue until
// the first day of that issue month.
export function getEditorMonthKey(): string {
  const now = new Date();
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}`;
}

export function getPreviousMonthKey(deadlineDay: number = 20): string {
  const now = new Date();
  const dayOfMonth = now.getDate();
  
  // Previous collection period is one month before current
  const monthsAhead = dayOfMonth > deadlineDay ? 1 : 0;
  
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
  return `${targetMonth.getFullYear()}-${String(targetMonth.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthName(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
