import type { Submission, SubmissionCategory } from './types';

const CATEGORY_LABELS: Partial<Record<SubmissionCategory, string>> = {
  'Neighbor Appreciation': 'Neighbor Appreciation',
  Classifieds: 'Classifieds',
  'Local Event Announcement': 'Events',
  'Lost & Found': 'Lost & Found',
};

const ROUTINE_TITLE_CATEGORIES = new Set<SubmissionCategory>([
  'President\'s Note',
  'Letter from the Editor',
  'Board Notes',
  'Office Notes',
  'ACC Activity Log',
  'CSC Table',
  'Security Report',
  'Association Events',
  'Errata',
]);

const METADATA_LABELS = new Set([
  'author',
  'full name',
  'email',
  'location',
  'event date',
  'event time',
  'event location',
  'sighting location',
  'type',
  'project type',
  'in response to',
]);

interface ParsedNewsletterSubmission {
  title: string;
  byline: string;
  body: string;
  metadata: Record<string, string>;
}

function readLabelledValue(line: string): { label: string; value: string } | null {
  const match = line.match(/^([^:]{1,40}):\s*(.*)$/);
  if (!match) return null;

  const label = match[1].trim().toLowerCase();
  if (!METADATA_LABELS.has(label)) return null;
  return { label, value: match[2].trim() };
}

function normalizeSectionHeadings(body: string): string {
  return body
    .split('\n')
    .map((line) => line.replace(/^\s*#{1,6}\s+(.+)$/, '### $1'))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseSubmission(submission: Submission): ParsedNewsletterSubmission {
  const lines = submission.content.split('\n');
  const firstLine = lines[0]?.trim() || '';
  const metadata: Record<string, string> = {};
  let parsedTitle = '';
  let parsedByline = '';

  if (/^title:/i.test(firstLine)) {
    parsedTitle = firstLine.replace(/^title:\s*/i, '').trim();
  } else if (/^author:/i.test(firstLine)) {
    parsedByline = firstLine.replace(/^author:\s*/i, '').trim();
  } else {
    const titleMatch = firstLine.match(/^(.+?)\s+-\s+(.+)$/);
    if (titleMatch) {
      parsedByline = titleMatch[1].trim();
      parsedTitle = titleMatch[2].trim();
    } else if (firstLine && !readLabelledValue(firstLine)) {
      parsedByline = firstLine.replace(/^published name:\s*/i, '').trim();
    }
  }

  let bodyStart = 1;
  let sawMetadata = false;

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    const labelled = readLabelledValue(line);

    if (labelled) {
      metadata[labelled.label] = labelled.value;
      sawMetadata = true;
      if (labelled.label === 'author' && !parsedByline) parsedByline = labelled.value;
      continue;
    }

    if (sawMetadata && line.trim() === '') {
      bodyStart = index + 1;
      break;
    }
  }

  const fallbackTitle = ROUTINE_TITLE_CATEGORIES.has(submission.category)
    ? submission.category
    : 'Untitled submission';

  return {
    title: submission.title?.trim() || parsedTitle || fallbackTitle,
    byline: submission.publishedName?.trim() || parsedByline || 'Uncredited',
    body: normalizeSectionHeadings(lines.slice(bodyStart).join('\n')),
    metadata,
  };
}

function specialDetails(category: SubmissionCategory, metadata: Record<string, string>): string[] {
  if (category === 'Local Event Announcement') {
    const details = [
      metadata['event date'] && `**Date:** ${metadata['event date']}`,
      metadata['event time'] && `**Time:** ${metadata['event time']}`,
      metadata['event location'] && `**Location:** ${metadata['event location']}`,
    ].filter((detail): detail is string => Boolean(detail));

    return details.length > 0 ? [details.join('  |  ')] : [];
  }

  if (category === 'Lost & Found' && metadata.type) {
    return [`**${metadata.type.charAt(0).toUpperCase()}${metadata.type.slice(1).toLowerCase()}**`];
  }

  return [];
}

export function getNewsletterCategoryLabel(category: SubmissionCategory): string | undefined {
  return CATEGORY_LABELS[category];
}

export function formatSubmissionForNewsletter(submission: Submission): string {
  if (submission.itemType === 'placeholder') {
    return [
      `*** PLACEHOLDER: ${submission.title || submission.category} ***`,
      submission.editorNotes || submission.content,
      '*** NEEDS ATTENTION BEFORE FINAL LAYOUT ***',
    ].join('\n');
  }

  const parsed = parseSubmission(submission);
  const sections = [
    `# ${parsed.title}`,
    `## ${parsed.byline}`,
    ...specialDetails(submission.category, parsed.metadata),
    parsed.body,
  ].filter((section): section is string => Boolean(section));

  return sections.join('\n\n');
}
