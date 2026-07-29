export interface CaptionContestSchedule {
  enabled: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateInput(value: unknown): value is string {
  return typeof value === 'string' && DATE_RE.test(value);
}

export function normalizeDateInput(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  return isDateInput(value) ? value : null;
}

export function getCurrentMonthStartDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export function getCaptionEntryWindow(contest: CaptionContestSchedule, now = new Date()) {
  return {
    startDate: contest.startDate || getCurrentMonthStartDate(now),
    endDate: contest.endDate || null,
  };
}

export function isCaptionContestOpen(contest: CaptionContestSchedule, now = new Date()): boolean {
  if (!contest.enabled) return false;

  const nowTime = now.getTime();
  const startTime = contest.startDate ? new Date(`${contest.startDate}T00:00:00`).getTime() : null;
  const endTime = contest.endDate ? new Date(`${contest.endDate}T23:59:59.999`).getTime() : null;

  if (startTime !== null && Number.isFinite(startTime) && nowTime < startTime) return false;
  if (endTime !== null && Number.isFinite(endTime) && nowTime > endTime) return false;
  return true;
}
