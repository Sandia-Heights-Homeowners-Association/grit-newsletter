'use client';

import { useState, useEffect } from 'react';
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
      bg: 'bg-red-50',
      border: 'border-red-300',
      hoverBorder: 'hover:border-red-400',
      text: 'text-red-700',
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
  onOrderChange: (orderedIds: string[]) => void;
}

interface SubmissionTileProps {
  submission: Submission;
  isDragging?: boolean;
}

function extractTitle(content: string, category?: string): string {
  const lines = content.split('\n');
  const firstLine = lines[0]?.trim() || '';
  const categoryFallback = category || 'Untitled';

  // Routine/committee: "Author: Name" — no article title concept, group by category
  if (firstLine.startsWith('Author:')) {
    return categoryFallback;
  }

  // Truly empty first line or starts with a metadata field — use category name
  if (
    !firstLine ||
    firstLine.startsWith('Full Name:') ||
    firstLine.startsWith('Email:') ||
    firstLine.startsWith('In Response To:') ||
    firstLine.startsWith('Type:') ||
    firstLine.startsWith('Project Type:') ||
    firstLine.startsWith('Sighting Location:')
  ) {
    return categoryFallback;
  }

  // Community format: "PublishedName - Title" (title is optional).
  // Require a space on each side of the dash so hyphenated names like "Mary-Jane" don't false-match.
  const titleMatch = firstLine.match(/^(.+?)\s+-\s+(.+)$/);
  if (titleMatch) {
    const parsedTitle = titleMatch[2]?.trim();
    if (parsedTitle) {
      return parsedTitle;
    }
  }

  // No explicit article title — use the published name (first line).
  // This is more specific than the category name, which is already shown in the tile subtitle.
  return firstLine;
}

function extractAuthor(content: string): string {
  // Parse the raw submission format
  const lines = content.split('\n');
  const firstLine = lines[0]?.trim() || '';
  
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

function SortableSubmissionTile({ submission }: { submission: Submission }) {
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
  const wordCount = getWordCount(submission.content);
  const colors = getSectionColors(submission.category);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        ${colors.bg} rounded-md border-2 p-2 cursor-move
        transition-all duration-200
        ${isDragging ? 'border-orange-400 shadow-lg' : `${colors.border} ${colors.hoverBorder} hover:shadow-md`}
      `}
    >
      <div className="flex items-center gap-2">
        {/* Drag Handle */}
        <div className="text-gray-400 text-base flex-shrink-0">⋮⋮</div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm truncate">
            {title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-0.5">
            <span className="truncate">{author}</span>
            <span className="text-gray-400">•</span>
            <span className={`${colors.text} font-medium truncate`}>
              {submission.category}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500 flex-shrink-0">{wordCount} words</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContentFlow({ submissions, selectedMonth, customOrder, onOrderChange }: ContentFlowProps) {
  const [orderedSubmissions, setOrderedSubmissions] = useState<Submission[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

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

  // Initialize ordered submissions when submissions or month changes
  useEffect(() => {
    const monthSubmissions = submissions.filter(
      s => s.disposition === selectedMonth
    );
    
    // If custom order exists, use it
    if (customOrder && customOrder.length > 0) {
      const ordered = customOrder
        .map(id => monthSubmissions.find(s => s.id === id))
        .filter((s): s is Submission => s !== undefined);
      setOrderedSubmissions(ordered);
      return;
    }
    
    // Otherwise, group by section and maintain section order
    const grouped: Submission[] = [];
    
    NEWSLETTER_SECTIONS.forEach(section => {
      const sectionSubs = monthSubmissions.filter(s => 
        section.categories.includes(s.category)
      );
      grouped.push(...sectionSubs);
    });
    
    setOrderedSubmissions(grouped);
  }, [submissions, selectedMonth, customOrder]);

  // Notify parent of order changes
  useEffect(() => {
    if (orderedSubmissions.length > 0) {
      onOrderChange(orderedSubmissions.map(s => s.id));
    }
  }, [orderedSubmissions, onOrderChange]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setOrderedSubmissions((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
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
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeSubmission ? (
            (() => {
              const colors = getSectionColors(activeSubmission.category);
              return (
                <div className={`${colors.bg} rounded-md border-2 border-orange-400 p-2 shadow-2xl opacity-95`}>
                  <div className="flex items-center gap-2">
                    <div className="text-gray-400 text-base flex-shrink-0">⋮⋮</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm truncate">
                        {extractTitle(activeSubmission.content, activeSubmission.category)}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-0.5">
                        <span className="truncate">{extractAuthor(activeSubmission.content)}</span>
                        <span className="text-gray-400">•</span>
                        <span className={`${colors.text} font-medium truncate`}>
                          {activeSubmission.category}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500 flex-shrink-0">{getWordCount(activeSubmission.content)} words</span>
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
