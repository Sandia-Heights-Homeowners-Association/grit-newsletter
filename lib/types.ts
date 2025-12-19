// Submission categories
export const COMMUNITY_CATEGORIES = [
  'Classifieds',
  'Lost & Found',
  'On My Mind',
  'Response to Prior Content',
  'Local Event Announcement',
  'Kids\' Corner',
  'DIY & Crafts',
  'Neighbor Appreciation',
  'Nature & Wildlife',
] as const;

export const ROUTINE_CATEGORIES = [
  'President\'s Note',
  'Board Notes',
  'Office Notes',
  'ACC Activity Log',
  'CSC Table',
  'Security Report',
  'Association Events',
] as const;

export const COMMITTEE_CATEGORIES = [
  'The Board',
  'General Announcements',
  'Architectural Control Committee (ACC)',
  'Covenant Support Committee (CSC)',
  'Communications & Publications Committee',
  'Community Service & Membership Committee',
  'Environment & Safety Committee',
  'Executive Committee',
  'Finance Committee',
  'Governance Committee',
  'Nominating Committee',
] as const;

export type CommunityCategory = typeof COMMUNITY_CATEGORIES[number];
export type RoutineCategory = typeof ROUTINE_CATEGORIES[number];
export type CommitteeCategory = typeof COMMITTEE_CATEGORIES[number];
export type SubmissionCategory = CommunityCategory | RoutineCategory | CommitteeCategory;

// Disposition can be: specific month (YYYY-MM), 'backlog', or 'archived'
// If disposition is a month string, it means "Accepted for [Month]"
// 'backlog' means saved for future use
// 'archived' means not being used
// Empty/undefined means not yet reviewed
export type DispositionStatus = string; // Either YYYY-MM format, 'backlog', or 'archived', or empty

export interface Submission {
  id: string;
  category: SubmissionCategory;
  content: string;
  submittedAt: Date;
  disposition?: DispositionStatus; // Optional - undefined means not yet reviewed
  month: string; // Format: YYYY-MM - the month this was originally submitted for
  publishedName?: string; // Name as it should appear in contributor list
}

export interface CategoryStats {
  category: SubmissionCategory;
  count: number;
}
