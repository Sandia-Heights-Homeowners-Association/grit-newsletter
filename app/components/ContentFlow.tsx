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

// Define the 9 major newsletter sections in order
const NEWSLETTER_SECTIONS = [
  {
    id: 'routine-main',
    name: 'Main Routine Content',
    categories: ['President\'s Note', 'Board Notes', 'Office Notes', 'Association Events'],
  },
  {
    id: 'committee-special',
    name: 'Special Committee Sections',
    categories: ['The Board', 'General Announcements'],
  },
  {
    id: 'committee-other',
    name: 'Other Committee Content',
    categories: [
      'Architectural Committee',
      'Club Representatives',
      'Communications & Social Media',
      'Greenbelt & Nature Preserve',
      'Landscape',
      'Sandia Sharks',
      'Security & Neighborhood Watch',
      'Volunteer',
      'Website & Technology',
      'Other', // Committee Other
    ],
  },
  {
    id: 'community-main',
    name: 'Community Stories',
    categories: [
      'On My Mind',
      'Neighbor Appreciation',
      'Nature & Wildlife',
      'Response',
      'Local Event',
      'History & Memories',
    ],
  },
  {
    id: 'community-lifestyle',
    name: 'Family & Lifestyle',
    categories: [
      'Home, DIY & Crafts',
      'Kids\' Corner',
      'Pets & Critters',
    ],
  },
  {
    id: 'community-board',
    name: 'Community Board',
    categories: [
      'General Submission / Other',
    ],
  },
  {
    id: 'community-classifieds',
    name: 'Classifieds & Lost Items',
    categories: ['Classifieds', 'Lost & Found'],
  },
  {
    id: 'end-material',
    name: 'End Material',
    categories: ['ACC Activity Log', 'CSC Table', 'Security Report'],
  },
];

interface ContentFlowProps {
  submissions: Submission[];
  selectedMonth: string;
  onOrderChange: (orderedIds: string[]) => void;
}

interface SubmissionTileProps {
  submission: Submission;
  isDragging?: boolean;
}

function extractTitle(content: string): string {
  // Parse the raw submission format
  // First line has: "PublishedName - Title" or just "PublishedName"
  const lines = content.split('\n');
  const firstLine = lines[0]?.trim() || '';
  
  // Check if first line contains a title (has " - " separator)
  const titleMatch = firstLine.match(/^(.+?)\s*-\s*(.+)$/);
  
  if (titleMatch && titleMatch[2]) {
    return titleMatch[2].trim();
  }
  
  return 'Untitled';
}

function extractAuthor(content: string): string {
  // Parse the raw submission format
  // First line has: "PublishedName - Title" or just "PublishedName"
  const lines = content.split('\n');
  const firstLine = lines[0]?.trim() || '';
  
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

  const title = extractTitle(submission.content);
  const author = extractAuthor(submission.content);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        bg-white rounded-lg border-2 p-4 cursor-move
        transition-all duration-200
        ${isDragging ? 'border-orange-400 shadow-lg' : 'border-orange-200 hover:border-orange-300 hover:shadow-md'}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div className="text-gray-400 text-xl mt-0.5">⋮⋮</div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate mb-1">
            {title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="truncate">{author}</span>
            <span className="text-gray-400">•</span>
            <span className="text-orange-600 text-xs font-medium truncate">
              {submission.category}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContentFlow({ submissions, selectedMonth, onOrderChange }: ContentFlowProps) {
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
    
    // Group by section and maintain section order
    const grouped: Submission[] = [];
    
    NEWSLETTER_SECTIONS.forEach(section => {
      const sectionSubs = monthSubmissions.filter(s => 
        section.categories.includes(s.category)
      );
      grouped.push(...sectionSubs);
    });
    
    setOrderedSubmissions(grouped);
  }, [submissions, selectedMonth]);

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

  // Group submissions by section for display
  const groupedBySection = NEWSLETTER_SECTIONS.map(section => {
    const sectionSubs = orderedSubmissions.filter(s => 
      section.categories.includes(s.category)
    );
    return {
      ...section,
      submissions: sectionSubs,
    };
  }).filter(section => section.submissions.length > 0);

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
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-orange-900 mb-2">
          Content Flow
        </h2>
        <p className="text-gray-700 text-sm">
          Drag articles to reorder them. The Full Newsletter Preview below will reflect your custom order.
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
          <div className="space-y-8">
            {groupedBySection.map(section => (
              <div key={section.id} className="space-y-3">
                {/* Section Header */}
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-amber-800">
                    {section.name}
                  </h3>
                  <span className="text-xs text-gray-500 font-medium">
                    ({section.submissions.length})
                  </span>
                </div>

                {/* Section Submissions */}
                <div className="space-y-2 pl-4">
                  {section.submissions.map(submission => (
                    <SortableSubmissionTile
                      key={submission.id}
                      submission={submission}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeSubmission ? (
            <div className="bg-white rounded-lg border-2 border-orange-400 p-4 shadow-2xl opacity-90">
              <div className="flex items-start gap-3">
                <div className="text-gray-400 text-xl mt-0.5">⋮⋮</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate mb-1">
                    {extractTitle(activeSubmission.content)}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="truncate">{extractAuthor(activeSubmission.content)}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-orange-600 text-xs font-medium truncate">
                      {activeSubmission.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
