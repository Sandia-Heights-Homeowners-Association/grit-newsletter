// Submission categories
export const COMMUNITY_CATEGORIES = [
  'Classifieds',
  'Lost & Found',
  'On My Mind',
  'Response to Prior Content',
  'Local Event Announcement',
  'Kids\' Corner',
  'DIY & Crafts',
  'Rants & Raves',
  'Neighbor Appreciation',
  'Wildlife',
  'Photos',
] as const;

export const ROUTINE_CATEGORIES = [
  'President\'s Note',
  'Board Notes',
  'Office Notes',
  'ACC Activity Log',
  'CSC Table',
  'Security Report',
] as const;

export const COMMITTEE_CATEGORIES = [
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

export type DispositionStatus = 'published' | 'backlogged' | 'archived';

export interface Submission {
  id: string;
  category: SubmissionCategory;
  content: string;
  submittedAt: Date;
  disposition: DispositionStatus;
  month: string; // Format: YYYY-MM
}

export interface SectionProgress {
  category: SubmissionCategory;
  isComplete: boolean;
  editedContent?: string;
}

export interface CategoryStats {
  category: SubmissionCategory;
  count: number;
}

export interface NewsletterMonth {
  month: string; // Format: YYYY-MM
  sections: SectionProgress[];
}
