'use client';

import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Submission } from '@/lib/types';

// Define the 9 major newsletter sections in order with color coding
const NEWSLETTER_SECTIONS = [
  {
    id: 'routine-main',
    name: 'Main Routine Content',
    categories: ['Letter from the Editor', 'President\'s Note', 'Board Notes', 'Office Notes', 'Association Events'],
    colors: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      hoverBorder: 'hover:border-blue-400',
      text: 'text-blue-700',
    },
  },
  {
    id: 'committee-special',
    name: 'Special Committee Sections',
    categories: ['The Board', 'General Announcements'],
    colors: {
      bg: 'bg-purple-50',
      border: 'border-purple-300',
      hoverBorder: 'hover:border-purple-400',
      text: 'text-purple-700',
    },
  },
  {
    id: 'committee-other',
    name: 'Other Committee Content',
    categories: [
      'Architectural Control Committee (ACC)',
      'Covenant Support Committee (CSC)',
      'Communications & Publications Committee',
      'Community Service & Membership Committee',
      'Environment & Safety Committee',
      'Executive Committee',
      'Finance Committee',
      'Governance Committee',
      'Nominating Committee',
      'Other', // Committee Other
    ],
    colors: {
      bg: 'bg-indigo-50',
      border: 'border-indigo-300',
      hoverBorder: 'hover:border-indigo-400',
      text: 'text-indigo-700',
    },
  },
  {
    id: 'community-main',
    name: 'Community Stories',
    categories: [
      'On My Mind',
      'Neighbor Appreciation',
      'Nature & Wildlife',
      'Response to Prior Content',
      'Local Event Announcement',
      'History & Memories',
    ],
    colors: {
      bg: 'bg-orange-50',
      border: 'border-orange-300',
      hoverBorder: 'hover:border-orange-400',
      text: 'text-orange-700',
    },
  },
  {
    id: 'community-lifestyle',
    name: 'Family & Lifestyle',
    categories: [
      'Home, DIY & Crafts',
      'Kids\' Corner',
      'Pets & Critters',
    ],
    colors: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      hoverBorder: 'hover:border-emerald-400',
      text: 'text-emerald-700',
    },
  },
  {
    id: 'community-board',
    name: 'Community Board',
    categories: [
      'General Submission / Other',
    ],
    colors: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      hoverBorder: 'hover:border-amber-400',
      text: 'text-amber-700',
    },
  },
  {
    id: 'community-classifieds',
    name: 'Classifieds & Lost Items',
    categories: ['Classifieds', 'Lost & Found'],
    colors: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      hoverBorder: 'hover:border-yellow-400',
      text: 'text-yellow-700',
    },
  },
  {
    id: 'end-material',
    name: 'End Material',
    categories: ['ACC Activity Log', 'CSC Table', 'Security Report', 'Errata', 'Other'],
    colors: {
      bg: 'bg-gray-50',
      border: 'border-gray-300',
      hoverBorder: 'hover:border-gray-400',
      text: 'text-gray-700',
    },
  },
];

// Helper to get section colors for a category
function getSectionColors(category: string) {
  for (const section of NEWSLETTER_SECTIONS) {
    if (section.categories.includes(category)) {
      return section.colors;
    }
  }
  // Default colors if category not found
  return {
    bg: 'bg-gray-50',
    border: 'border-gray-300',
    hoverBorder: 'hover:border-gray-400',
    text: 'text-gray-700',
  };
}

// Helper to count words in content
function getWordCount(content: string): number {
  // Remove metadata and get only the actual content
  const lines = content.split('\n');
  let contentStart = 0;
  
  // Find where actual content starts (after metadata block)
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '' && i > 1 && 
        (lines[i-1].includes('Location:') || lines[i-1].includes('Email:') || lines[i-1].includes('Sighting Location:'))) {
      contentStart = i + 1;
      break;
    }
  }
  
  const actualContent = lines.slice(contentStart).join(' ');
  return actualContent.trim().split(/\s+/).filter(word => word.length > 0).length;
}

interface ContentFlowProps {
  submissions: Submission[];
  selectedMonth: string;
  customOrder?: string[];
  categoryOrder?: string[];
  onMoveToBacklog?: (submissionId: string) => void;
  onDismissMissing?: (category: string) => void;
  onDismissPlaceholder?: (submissionId: string) => void;
  onOrderChange: (orderedIds: string[]) => void;
}

interface SubmissionTileProps {
  submission: Submission;
  isDragging?: boolean;
}

function uniqueSubmissionsById(submissions: Submission[]): Submission[] {
  const seen = new Set<string>();
  return submissions.filter((submission) => {
    if (seen.has(submission.id)) return false;
    seen.add(submission.id);
    return true;
  });
}

function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

function extractTitle(content: string, category?: string): string {
  const lines = content.split('\n');
  const firstLine = lines[0]?.trim() || '';
  const categoryFallback = category || 'Untitled';

  // ── Committee new format: "Title: My Article" on first line ──────────────────
  if (firstLine.startsWith('Title:')) {
    const parsed = firstLine.replace(/^Title:\s*/i, '').trim();
    return parsed || categoryFallback;
  }

  // ── Routine / committee: "Author: Name …" ──────────────────────────────────
  // These sections don't have article titles; label by section name.
  if (firstLine.startsWith('Author:')) {
    return categoryFallback;
  }

  // ── Committee submitted without Author line (starts with Email / body) ──────
  // Also catches truly empty content.
  if (
    !firstLine ||
    firstLine.startsWith('Email:') ||
    firstLine.startsWith('Full Name:') ||
    firstLine.startsWith('In Response To:') ||
    firstLine.startsWith('Type:') ||
    firstLine.startsWith('Project Type:') ||
    firstLine.startsWith('Sighting Location:')
  ) {
    return categoryFallback;
  }

  // ── Old community format: "Published Name: Jane Smith" ───────────────────────
  // Earlier form versions prefixed the published name with "Published Name:".
  // Strip the prefix and use the name itself as the display title.
  if (firstLine.startsWith('Published Name:')) {
    const name = firstLine.replace(/^Published Name:\s*/i, '').trim();
    return name || categoryFallback;
  }

  // ── Current community format: "PublishedName - Title" ────────────────────────
  // Title is optional. Require spaces around the dash so hyphenated names
  // like "Mary-Jane" are not misread as Name="Mary" / Title="Jane".
  const titleMatch = firstLine.match(/^(.+?)\s+-\s+(.+)$/);
  if (titleMatch) {
    const parsedTitle = titleMatch[2]?.trim();
    if (parsedTitle) {
      return parsedTitle;
    }
  }

  // ── Community submission with no explicit title: first line is the name ──────
  // Use the published name — it is always unique and more meaningful than the
  // category name (which is already shown in the tile subtitle).
  return firstLine;
}

function extractAuthor(content: string): string {
  // Parse the raw submission format
  const lines = content.split('\n');
  const firstLine = lines[0]?.trim() || '';

  // Handle committee new format: "Title: ...", then "Author: Name"
  if (firstLine.startsWith('Title:')) {
    const authorLine = lines.find((l: string) => l.startsWith('Author:'));
    if (authorLine) return authorLine.replace('Author:', '').trim() || 'Unknown Author';
    return 'Unknown Author';
  }

  // Handle routine/committee format: "Author: Name"
  if (firstLine.startsWith('Author:')) {
    return firstLine.replace('Author:', '').trim() || 'Unknown Author';
  }
  
  // If first line is empty or looks like metadata, try to find "Full Name:"
  if (!firstLine || firstLine.startsWith('Full Name:') || firstLine.startsWith('Email:')) {
    const fullNameLine = lines.find((l: string) => l.startsWith('Full Name:'));
    if (fullNameLine) {
      return fullNameLine.replace('Full Name:', '').trim();
    }
    return 'Unknown Author';
  }
  
  // Check if first line has "PublishedName - Title" format
  const titleMatch = firstLine.match(/^(.+?)\s*-\s*(.+)$/);
  
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  // No title separator, entire first line is the published name
  return firstLine || 'Unknown Author';
}

function extractDisplayContent(content: string): string {
  const lines = content.split('\n');

  const contentStart = lines.findIndex((line, index) => (
    index > 1 &&
    line.trim() === '' &&
    (lines[index - 1]?.includes('Location:') ||
      lines[index - 1]?.includes('Email:') ||
      lines[index - 1]?.includes('Sighting Location:'))
  ));

  return (contentStart >= 0 ? lines.slice(contentStart + 1) : lines).join('\n').trim();
}

function isAutoMissingPlaceholder(submission: Submission): boolean {
  return submission.id.startsWith('auto-placeholder-') && submission.needsAttention === true;
}

function isManualPlaceholder(submission: Submission): boolean {
  return submission.itemType === 'placeholder' && !isAutoMissingPlaceholder(submission);
}

function SortableSubmissionTile({
  submission,
  isExpanded,
  onToggleExpanded,
  onMoveToBacklog,
  onDismissMissing,
  onDismissPlaceholder,
}: {
  submission: Submission;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onMoveToBacklog?: (submissionId: string) => void;
  onDismissMissing?: (category: string) => void;
  onDismissPlaceholder?: (submissionId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: submission.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const title = extractTitle(submission.content, submission.category);
  const author = extractAuthor(submission.content);
  const missingPlaceholder = isAutoMissingPlaceholder(submission);
  const manualPlaceholder = isManualPlaceholder(submission);
  const wordCount = missingPlaceholder || manualPlaceholder ? 0 : getWordCount(submission.content);
  const colors = getSectionColors(submission.category);
  const tileColors = missingPlaceholder
    ? {
        bg: 'bg-red-100',
        border: 'border-red-500',
        hoverBorder: 'hover:border-red-600',
        text: 'text-red-800',
      }
    : manualPlaceholder
    ? {
        bg: 'bg-orange-100',
        border: 'border-orange-600',
        hoverBorder: 'hover:border-orange-700',
        text: 'text-orange-900',
      }
    : colors;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        ${tileColors.bg} rounded-md ${manualPlaceholder ? 'border-4' : 'border-2'} p-2
        transition-all duration-200
        ${isDragging ? 'border-orange-400 shadow-lg' : `${tileColors.border} ${tileColors.hoverBorder} hover:shadow-md`}
      `}
    >
      <div className="flex items-center gap-2">
        {/* Drag Handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab rounded px-1.5 py-1 text-base text-gray-400 hover:bg-white/70 active:cursor-grabbing"
          aria-label={`Drag ${title}`}
        >
          ⋮⋮
        </button>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm truncate">
            {manualPlaceholder ? `PLACEHOLDER: ${title}` : title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-0.5">
            {!missingPlaceholder && !manualPlaceholder && (
              <>
                <span className="truncate">{author}</span>
                <span className="text-gray-400">•</span>
              </>
            )}
            {missingPlaceholder && (
              <>
                <span className="font-semibold text-red-800">Missing monthly item</span>
                <span className="text-gray-400">•</span>
              </>
            )}
            {manualPlaceholder && (
              <>
                <span className="font-semibold text-orange-900">Quick placeholder</span>
                <span className="text-gray-400">•</span>
              </>
            )}
            <span className={`${tileColors.text} font-medium truncate`}>
              {submission.category}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500 flex-shrink-0">{wordCount} words</span>
          </div>
        </div>
        {!missingPlaceholder && !manualPlaceholder && onMoveToBacklog && (
          <button
            type="button"
            onClick={() => onMoveToBacklog(submission.id)}
            className="flex-shrink-0 rounded border border-yellow-300 bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-900 transition hover:bg-yellow-100"
          >
            Backlog
          </button>
        )}
        {missingPlaceholder && onDismissMissing && (
          <button
            type="button"
            onClick={() => onDismissMissing(submission.category)}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border border-red-400 bg-white text-sm font-bold text-red-800 transition hover:bg-red-50"
            aria-label={`Dismiss missing ${submission.category}`}
            title="Dismiss"
          >
            ×
          </button>
        )}
        {manualPlaceholder && onDismissPlaceholder && (
          <button
            type="button"
            onClick={() => onDismissPlaceholder(submission.id)}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border border-orange-500 bg-white text-sm font-bold text-orange-900 transition hover:bg-orange-50"
            aria-label={`Dismiss placeholder ${title}`}
            title="Dismiss placeholder"
          >
            ×
          </button>
        )}
        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex-shrink-0 rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      {isExpanded && (
        <div className="mt-3 rounded border border-white/80 bg-white/80 p-3">
          <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap font-sans text-sm leading-6 text-gray-800">
            {extractDisplayContent(submission.content) || submission.content}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function ContentFlow({
  submissions,
  selectedMonth,
  customOrder,
  categoryOrder,
  onMoveToBacklog,
  onDismissMissing,
  onDismissPlaceholder,
  onOrderChange,
}: ContentFlowProps) {
  const [orderedSubmissions, setOrderedSubmissions] = useState<Submission[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Build the ordered list whenever the source data or month changes.
  // We intentionally omit `customOrder` from deps — the only time we
  // use it is on the *initial* mount or when the month changes.  After
  // that, local drag-and-drop state is authoritative.
  useEffect(() => {
    const monthSubmissions = uniqueSubmissionsById(
      submissions.filter(s => s.disposition === selectedMonth)
    );
    const orderedIds = uniqueIds(customOrder || []);

    // If we already have a custom order, apply it
    if (orderedIds.length > 0) {
      const ordered = orderedIds
        .map(id => monthSubmissions.find(s => s.id === id))
        .filter((s): s is Submission => s !== undefined);
      // Include any new submissions not yet in the custom order
      const remaining = monthSubmissions.filter(
        s => !orderedIds.includes(s.id)
      );
      setOrderedSubmissions([...ordered, ...remaining]);
      return;
    }

    // Otherwise, group by section and maintain section order
    const grouped: Submission[] = [];

    if (categoryOrder && categoryOrder.length > 0) {
      categoryOrder.forEach(category => {
        grouped.push(...monthSubmissions.filter(s => s.category === category));
      });
      grouped.push(...monthSubmissions.filter(s => !categoryOrder.includes(s.category)));
    } else {
      NEWSLETTER_SECTIONS.forEach(section => {
        const sectionSubs = monthSubmissions.filter(s =>
          section.categories.includes(s.category)
        );
        grouped.push(...sectionSubs);
      });
    }

    setOrderedSubmissions(uniqueSubmissionsById(grouped));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissions, selectedMonth, categoryOrder]);

  // Stable ref for the callback so we can call it without re-triggering effects
  const onOrderChangeRef = React.useRef(onOrderChange);
  useEffect(() => {
    onOrderChangeRef.current = onOrderChange;
  }, [onOrderChange]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = orderedSubmissions.findIndex(item => item.id === active.id);
      const newIndex = orderedSubmissions.findIndex(item => item.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newItems = uniqueSubmissionsById(arrayMove(orderedSubmissions, oldIndex, newIndex));
      setOrderedSubmissions(newItems);
      onOrderChangeRef.current(newItems.map(s => s.id));
    }
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  if (orderedSubmissions.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-xl border-2 border-orange-200 text-center">
        <p className="text-gray-600">
          No submissions accepted for {selectedMonth} yet.
        </p>
      </div>
    );
  }

  const activeSubmission = orderedSubmissions.find(s => s.id === activeId);

  return (
    <div className="rounded-xl bg-white p-6 shadow-xl border-2 border-orange-200">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-orange-900 mb-2">
          Content Flow
        </h2>
        <p className="text-gray-700 text-sm">
          Drag articles to reorder them. Colors indicate newsletter sections. The Full Newsletter Preview below will reflect your custom order.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={orderedSubmissions.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1.5">
            {orderedSubmissions.map(submission => (
              <SortableSubmissionTile
                key={submission.id}
                submission={submission}
                isExpanded={expandedIds.has(submission.id)}
                onMoveToBacklog={onMoveToBacklog}
                onDismissMissing={onDismissMissing}
                onDismissPlaceholder={onDismissPlaceholder}
                onToggleExpanded={() => {
                  setExpandedIds(prev => {
                    const next = new Set(prev);
                    if (next.has(submission.id)) {
                      next.delete(submission.id);
                    } else {
                      next.add(submission.id);
                    }
                    return next;
                  });
                }}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeSubmission ? (
            (() => {
              const missingPlaceholder = isAutoMissingPlaceholder(activeSubmission);
              const manualPlaceholder = isManualPlaceholder(activeSubmission);
              const colors = missingPlaceholder
                ? {
                    bg: 'bg-red-100',
                    border: 'border-red-500',
                    hoverBorder: 'hover:border-red-600',
                    text: 'text-red-800',
                  }
                : manualPlaceholder
                ? {
                    bg: 'bg-orange-100',
                    border: 'border-orange-600',
                    hoverBorder: 'hover:border-orange-700',
                    text: 'text-orange-900',
                  }
                : getSectionColors(activeSubmission.category);
              return (
                <div className={`${colors.bg} rounded-md ${manualPlaceholder ? 'border-4' : 'border-2'} border-orange-400 p-2 shadow-2xl opacity-95`}>
                  <div className="flex items-center gap-2">
                    <div className="text-gray-400 text-base flex-shrink-0">⋮⋮</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">
                        {manualPlaceholder
                          ? `PLACEHOLDER: ${extractTitle(activeSubmission.content, activeSubmission.category)}`
                          : extractTitle(activeSubmission.content, activeSubmission.category)}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-0.5">
                        <span className="truncate">{extractAuthor(activeSubmission.content)}</span>
                        <span className="text-gray-400">•</span>
                        <span className={`${colors.text} font-medium truncate`}>
                          {activeSubmission.category}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500 flex-shrink-0">
                          {missingPlaceholder || manualPlaceholder ? 0 : getWordCount(activeSubmission.content)} words
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
