export interface ParsedSubmissionMetadata {
  title?: string;
  publishedName?: string;
  contactName?: string;
  contactEmail?: string;
  location?: string;
}

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readLineValue(lines: string[], label: string): string | undefined {
  const lowerLabel = `${label.toLowerCase()}:`;
  const line = lines.find(l => l.trim().toLowerCase().startsWith(lowerLabel));
  if (!line) return undefined;
  return clean(line.slice(line.indexOf(':') + 1));
}

export function parseSubmissionMetadata(content: string): ParsedSubmissionMetadata {
  const lines = content.split('\n');
  const firstLine = clean(lines[0]) || '';

  let title: string | undefined;
  let publishedName: string | undefined;

  if (firstLine.toLowerCase().startsWith('title:')) {
    title = clean(firstLine.slice(firstLine.indexOf(':') + 1));
    publishedName = readLineValue(lines, 'Author');
  } else if (firstLine.toLowerCase().startsWith('author:')) {
    publishedName = clean(firstLine.slice(firstLine.indexOf(':') + 1));
  } else {
    const titleMatch = firstLine.match(/^(.+?)\s+-\s+(.+)$/);
    if (titleMatch) {
      publishedName = clean(titleMatch[1]);
      title = clean(titleMatch[2]);
    } else {
      publishedName = clean(firstLine);
    }
  }

  return {
    title,
    publishedName,
    contactName: readLineValue(lines, 'Full Name') || readLineValue(lines, 'Author'),
    contactEmail: readLineValue(lines, 'Email'),
    location: readLineValue(lines, 'Location') || readLineValue(lines, 'Sighting Location') || readLineValue(lines, 'Event Location'),
  };
}

export function normalizeEmail(value: unknown): string | undefined {
  const email = clean(value)?.toLowerCase();
  if (!email) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

export function normalizeText(value: unknown): string | undefined {
  return clean(value);
}
