'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/app/components/Header';
import ContentFlow from '@/app/components/ContentFlow';
import { COMMUNITY_CATEGORIES, ROUTINE_CATEGORIES, COMMITTEE_CATEGORIES } from '@/lib/types';
import type { Submission, SubmissionCategory } from '@/lib/types';

const ALL_CATEGORIES = Array.from(new Set([
  ...COMMUNITY_CATEGORIES,
  ...ROUTINE_CATEGORIES,
  ...COMMITTEE_CATEGORIES,
])) as SubmissionCategory[];

const DEFAULT_CATEGORY_ORDER = Array.from(new Set([
  'Letter from the Editor',
  'President\'s Note',
  'Board Notes',
  'Office Notes',
  'Association Events',
  'The Board',
  'General Announcements',
  ...COMMITTEE_CATEGORIES.filter(cat => cat !== 'The Board' && cat !== 'General Announcements'),
  ...COMMUNITY_CATEGORIES.filter(cat => cat !== 'Classifieds' && cat !== 'Lost & Found'),
  'Classifieds',
  'Lost & Found',
  'ACC Activity Log',
  'CSC Table',
  'Security Report',
  'Errata',
  'Other',
])) as SubmissionCategory[];

const MONTHLY_PLACEHOLDER_CATEGORIES: SubmissionCategory[] = [
  'Letter from the Editor',
  'President\'s Note',
  'Board Notes',
  'Office Notes',
  'Association Events',
  'The Board',
  'General Announcements',
  'ACC Activity Log',
  'CSC Table',
  'Security Report',
];

type EditorView = 'inbox' | 'planning' | 'preview' | 'data';
type CaptionEntry = {
  id: string;
  publishedName: string;
  fullName: string;
  email: string;
  location: string;
  caption: string;
  submittedAt: Date | string;
};

function getSubmissionTitle(submission: Submission): string {
  if (submission.title) return submission.title;
  const firstLine = submission.content.split('\n')[0]?.trim() || '';
  if (firstLine.startsWith('Title:')) return firstLine.replace(/^Title:\s*/i, '').trim() || submission.category;
  const titleMatch = firstLine.match(/^(.+?)\s+-\s+(.+)$/);
  if (titleMatch?.[2]) return titleMatch[2].trim();
  return firstLine.replace(/^Author:\s*/i, '').trim() || submission.category;
}

function getSubmissionAuthor(submission: Submission): string {
  if (submission.publishedName) return submission.publishedName;
  const lines = submission.content.split('\n');
  const authorLine = lines.find(line => line.startsWith('Author:'));
  if (authorLine) return authorLine.replace(/^Author:\s*/i, '').trim();
  const firstLine = lines[0]?.trim() || '';
  const titleMatch = firstLine.match(/^(.+?)\s+-\s+(.+)$/);
  return titleMatch?.[1]?.trim() || firstLine.replace(/^Author:\s*/i, '').trim() || 'Unknown';
}

function uniqueSubmissionsById(submissions: Submission[]): Submission[] {
  const seen = new Set<string>();
  return submissions.filter((submission) => {
    if (seen.has(submission.id)) return false;
    seen.add(submission.id);
    return true;
  });
}

function buildCaptionVotingText(entries: CaptionEntry[]): string {
  return entries.map((entry, index) => `${index + 1}. ${entry.caption}`).join('\n\n');
}

function createAutoMissingPlaceholder(category: SubmissionCategory, month: string): Submission {
  return {
    id: `auto-placeholder-${month}-${category}`,
    category,
    content: `Missing monthly item: ${category}`,
    submittedAt: new Date(),
    disposition: month,
    month,
    title: `${category} Placeholder`,
    itemType: 'placeholder',
    editorNotes: `Missing monthly content for ${category}.`,
    priority: 'high',
    needsAttention: true,
  };
}

/** Resize an image file to at most maxDim px on the longest side, encoded as JPEG. */
async function resizeImageToDataUrl(file: File, maxDim = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to load image')); };
    img.src = objectUrl;
  });
}

export default function EditorPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showJsonViewer, setShowJsonViewer] = useState(false);
  const [currentMonth, setCurrentMonth] = useState('');
  const [databaseStatus, setDatabaseStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [databaseError, setDatabaseError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showCaptionContest, setShowCaptionContest] = useState(false);
  const [captionContest, setCaptionContest] = useState<{
    enabled: boolean;
    imageData: string | null;
    imageType: string | null;
    title: string | null;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
  }>({ enabled: false, imageData: null, imageType: null, title: null, description: null, startDate: null, endDate: null });
  const [captionEntries, setCaptionEntries] = useState<CaptionEntry[]>([]);
  const [captionContestTitle, setCaptionContestTitle] = useState('');
  const [captionContestDesc, setCaptionContestDesc] = useState('');
  const [captionContestStartDate, setCaptionContestStartDate] = useState('');
  const [captionContestEndDate, setCaptionContestEndDate] = useState('');
  const [captionEntryWindow, setCaptionEntryWindow] = useState<{ startDate: string | null; endDate: string | null }>({ startDate: null, endDate: null });
  const [captionImageFile, setCaptionImageFile] = useState<File | null>(null);
  const [captionImagePreview, setCaptionImagePreview] = useState<string | null>(null);
  const [captionImageUploading, setCaptionImageUploading] = useState(false);
  const [captionEntriesLoaded, setCaptionEntriesLoaded] = useState(false);
  const [deadlineDay, setDeadlineDay] = useState<number>(10);
  const [currentDeadlineInfo, setCurrentDeadlineInfo] = useState<{month: string; deadline: string}>({month: '', deadline: ''});
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<Array<{key: string; label: string}>>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dataViewerFilter, setDataViewerFilter] = useState<string>('all');
  const [dataViewerSort, setDataViewerSort] = useState<'newest' | 'oldest'>('newest');
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Array<{id: string; category: string; action: string}>>([]);
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<SubmissionCategory[]>(DEFAULT_CATEGORY_ORDER);
  const [defaultMonthlyCategories, setDefaultMonthlyCategories] = useState<SubmissionCategory[]>(MONTHLY_PLACEHOLDER_CATEGORIES);
  const [dismissedMissingCategories, setDismissedMissingCategories] = useState<Set<string>>(new Set());
  const [previewTab, setPreviewTab] = useState<'flow' | 'preview'>('flow');
  const [editorView, setEditorView] = useState<EditorView>('planning');
  const [expandedInboxItems, setExpandedInboxItems] = useState<Set<string>>(new Set());
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderCategory, setReminderCategory] = useState<SubmissionCategory>('General Announcements');
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderNotes, setReminderNotes] = useState('');
  const [reminderPriority, setReminderPriority] = useState<'low' | 'normal' | 'high'>('high');
  const [editingSubmission, setEditingSubmission] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    publishedName: string;
    title: string;
    fullName: string;
    email: string;
    location: string;
    actualContent: string;
    otherMetadata: string; // For special cases like "In Response To:", "Type:", etc.
  }>({
    publishedName: '',
    title: '',
    fullName: '',
    email: '',
    location: '',
    actualContent: '',
    otherMetadata: '',
  });

  const showToastNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const applyCaptionContestData = (data: {
    contest?: typeof captionContest;
    captions?: CaptionEntry[];
    entryWindow?: { startDate: string | null; endDate: string | null };
  }) => {
    if (!data.contest) return;
    setCaptionContest(data.contest);
    setCaptionEntries(data.captions || []);
    setCaptionContestTitle(data.contest.title || '');
    setCaptionContestDesc(data.contest.description || '');
    setCaptionContestStartDate(data.contest.startDate || data.entryWindow?.startDate || '');
    setCaptionContestEndDate(data.contest.endDate || '');
    setCaptionEntryWindow(data.entryWindow || {
      startDate: data.contest.startDate || null,
      endDate: data.contest.endDate || null,
    });
    setCaptionEntriesLoaded(true);
  };

  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const getPublishedWordCount = (submission: Submission): number => {
    return getWordCount(extractContent(submission.content, submission.category, submission));
  };

  const inboxSubmissions = submissions
    .filter(s => !s.disposition || s.disposition === '')
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  const plannedSubmissions = submissions.filter(s => s.disposition === selectedMonth);
  const backlogSubmissions = submissions.filter(s => s.disposition === 'backlog');
  const inboxAndBacklogSubmissions = uniqueSubmissionsById([
    ...inboxSubmissions,
    ...backlogSubmissions,
  ])
    .filter(s => s.itemType !== 'placeholder')
    .sort((a, b) => {
      const aRank = a.disposition === 'backlog' ? 1 : 0;
      const bRank = b.disposition === 'backlog' ? 1 : 0;
      if (aRank !== bRank) return aRank - bRank;
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });
  const missingMonthlyCategories = defaultMonthlyCategories.filter(category =>
    !plannedSubmissions.some(s => s.category === category && s.itemType !== 'placeholder')
  );
  const visibleMissingMonthlyCategories = missingMonthlyCategories.filter(category => !dismissedMissingCategories.has(category));
  const missingPlaceholderSubmissions = visibleMissingMonthlyCategories.map(category =>
    createAutoMissingPlaceholder(category, selectedMonth)
  );
  const flowSubmissions = uniqueSubmissionsById([...submissions, ...missingPlaceholderSubmissions]);

  const toggleInboxExpanded = (submissionId: string) => {
    setExpandedInboxItems(prev => {
      const next = new Set(prev);
      if (next.has(submissionId)) {
        next.delete(submissionId);
      } else {
        next.add(submissionId);
      }
      return next;
    });
  };

  const handleOrderChange = useCallback((orderedIds: string[]) => {
    setCustomOrder(orderedIds);

    if (!selectedMonth) return;

    fetch('/api/editor', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${password}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'updateContentOrder',
        month: selectedMonth,
        orderedIds,
      }),
    }).then((response) => {
      if (!response.ok) {
        showToastNotification('Failed to save content order');
      }
    }).catch((err) => {
      console.error('Failed to save content order:', err);
      showToastNotification('Failed to save content order');
    });
  }, [password, selectedMonth]);

  // Helper function to extract just the content that will be published
  const extractContent = (rawContent: string, category: SubmissionCategory, submission?: Submission): string => {
    if (submission?.itemType === 'placeholder') {
      return [
        `*** PLACEHOLDER: ${submission.title || category} ***`,
        submission.editorNotes || rawContent,
        '*** NEEDS ATTENTION BEFORE FINAL LAYOUT ***',
      ].join('\n');
    }

    const lines = rawContent.split('\n');
    const firstLine = lines[0] || '';

    let publishedName = '';
    let title = '';

    // Committee new format: first line is "Title: ...", second is "Author: ..."
    if (firstLine.startsWith('Title:')) {
      title = firstLine.replace(/^Title:\s*/i, '').trim();
      const authorLine = lines.find(l => l.startsWith('Author:'));
      publishedName = authorLine ? authorLine.replace(/^Author:\s*/i, '').trim() : '';
    } else {
      // Community / routine format: "PublishedName - Title" or just "PublishedName"
      const titleMatch = firstLine.match(/^(.+?)\s+-\s+(.+)$/);
      if (titleMatch) {
        publishedName = titleMatch[1].trim();
        title = titleMatch[2].trim();
      } else {
        publishedName = firstLine.replace(/^Author:\s*/i, '').trim();
      }
    }
    
    // Skip blank line, then skip metadata block (Full Name, Email, Location)
    let contentStart = 1;
    for (let i = 1; i < lines.length; i++) {
      // Look for the blank line after metadata
      if (lines[i].trim() === '' && i > 1 && 
          (lines[i-1].includes('Location:') || lines[i-1].includes('Email:'))) {
        contentStart = i + 1;
        break;
      }
    }
    
    // Extract the actual content
    const actualContent = lines.slice(contentStart).join('\n').trim();
    
    // Small entries get compact formatting
    const smallEntryCategories: SubmissionCategory[] = [
      'Classifieds',
      'Lost & Found',
      'Local Event Announcement'
    ];
    
    if (smallEntryCategories.includes(category)) {
      // For small entries: just show title/name and content
      if (title) {
        return `**${title}**\n\n${actualContent}`;
      } else {
        return actualContent;
      }
    }
    
    // Full articles: H1 Title (mandatory), H2 Author, then content
    let result = '';
    if (title) {
      result = `# ${title}\n\n## ${publishedName}\n\n${actualContent}`;
    } else {
      // If no title, use publishedName as title
      result = `# ${publishedName}\n\n${actualContent}`;
    }
    
    return result;
  };

  const generateFullNewsletterPreview = (): string => {
    // Get all submissions for the selected month
    let monthSubmissions = submissions.filter(s => s.disposition === selectedMonth);
    const autoPlaceholders = visibleMissingMonthlyCategories
      .filter(category => !monthSubmissions.some(s => s.category === category && s.itemType !== 'placeholder'))
      .map((category) => createAutoMissingPlaceholder(category, selectedMonth));

    monthSubmissions = [...monthSubmissions, ...autoPlaceholders];
    
    if (monthSubmissions.length === 0) {
      return 'No published content yet. Submissions will appear here once marked as published.';
    }

    // If custom order exists, use it; otherwise use default category order
    if (customOrder.length > 0) {
      const orderedSubs = customOrder
        .map(id => monthSubmissions.find(s => s.id === id))
        .filter((s): s is Submission => s !== undefined);
      const remainingSubs = monthSubmissions.filter(s => !customOrder.includes(s.id));
      
      if (orderedSubs.length > 0 || remainingSubs.length > 0) {
        const previewSubs = [...orderedSubs, ...remainingSubs];
        // Group consecutive submissions from the same category to add headings
        const sections: string[] = [];
        let currentCategory: SubmissionCategory | null = null;
        
        previewSubs.forEach(sub => {
          // Add category heading when category changes
          if (sub.category !== currentCategory) {
            sections.push(`== ${sub.category}`);
            currentCategory = sub.category;
          }
          
          // Add submission content
          sections.push(extractContent(sub.content, sub.category, sub));
        });
        
        return sections.join('\n\n');
      }
    }

    // Default behavior: use category-based ordering
    const sections: string[] = [];
    const emptySections: string[] = [];
    
    // Helper to add section content
    const addSection = (category: SubmissionCategory, sectionName: string) => {
      const categorySubs = submissions.filter(s => 
        s.category === category && s.disposition === selectedMonth
      );
      const previewCategorySubs = monthSubmissions.filter(s =>
        s.category === category && s.disposition === selectedMonth
      );
      
      if (previewCategorySubs.length > 0) {
        sections.push(`== ${sectionName}`);
        const formattedSubs = previewCategorySubs.map(s => extractContent(s.content, s.category, s));
        sections.push(formattedSubs.join('\n\n'));
      } else {
        emptySections.push(category);
      }
    };

    categoryOrder.forEach(category => addSection(category, category));

    let result = sections.length > 0 
      ? sections.join('\n\n') 
      : '';

    // Add empty sections notice at the end
    if (emptySections.length > 0) {
      result += `\n\n== List of Empty Sections\n\n`;
      result += `The following sections had no submissions this month:\n\n`;
      result += emptySections.map(s => `  • ${s}`).join('\n');
      result += `\n\nWe welcome your contributions! Please visit sandiahomeowners.org to submit content for next month's issue.`;
    }

    return result || 'No published content yet. Submissions will appear here once marked as published.';
  };

  const copyFullTextToClipboard = () => {
    const fullText = generateFullNewsletterPreview();
    navigator.clipboard.writeText(fullText).then(() => {
      showToastNotification('Full text copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
      showToastNotification('Failed to copy text');
    });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    // Try to load editor data - the server will validate the password
    await loadEditorData();
  };

  const loadEditorData = async (monthKey?: string) => {
    setLoading(true);
    setDatabaseStatus('checking');
    try {
      const url = monthKey ? `/api/editor?month=${monthKey}` : '/api/editor';
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${password}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissions(uniqueSubmissionsById(data.submissions || []));
        setCurrentMonth(data.month || '');
        setSelectedMonth(data.month || '');
        setAvailableMonths(data.availableMonths || []);
        setCustomOrder(Array.isArray(data.contentOrder) ? data.contentOrder : []);
        setCategoryOrder(
          Array.isArray(data.categoryOrder) && data.categoryOrder.length > 0
            ? Array.from(new Set([...data.categoryOrder, ...DEFAULT_CATEGORY_ORDER])) as SubmissionCategory[]
            : DEFAULT_CATEGORY_ORDER
        );
        setDefaultMonthlyCategories(
          Array.isArray(data.defaultMonthlyCategories)
            ? data.defaultMonthlyCategories.filter((category: string) => ALL_CATEGORIES.includes(category as SubmissionCategory)) as SubmissionCategory[]
            : MONTHLY_PLACEHOLDER_CATEGORIES
        );
        setDismissedMissingCategories(
          new Set(
            Array.isArray(data.dismissedMissingCategories)
              ? data.dismissedMissingCategories.filter((category: string) => ALL_CATEGORIES.includes(category as SubmissionCategory))
              : []
          )
        );
        setDeadlineDay(data.deadlineDay || 20);
        setCurrentDeadlineInfo(data.deadlineInfo || {month: '', deadline: ''});
        setDatabaseStatus('connected');
        setDatabaseError('');
        setAuthenticated(true);
        console.log('Editor data loaded:', { 
          submissions: data.submissions?.length || 0, 
          progress: data.progress?.length || 0,
          month: data.month,
          deadlineDay: data.deadlineDay
        });
      } else {
        console.error('Failed to load editor data:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        setDatabaseStatus('error');
        setDatabaseError(errorData.error || 'Failed to load data');
        setAuthError(response.status === 401 ? 'Incorrect password' : 'Failed to load data');
      }
    } catch (err) {
      console.error('Failed to load editor data:', err);
      setDatabaseStatus('error');
      setDatabaseError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const updateDisposition = async (submissionId: string, disposition: string) => {
    // Optimistically update UI immediately
    const sub = submissions.find(s => s.id === submissionId);
    if (!sub) return;

    setSubmissions(prev => prev.map(s => 
      s.id === submissionId ? { ...s, disposition } : s
    ));

    // Save immediately to server
    try {
      const response = await fetch('/api/editor', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'updateDisposition',
          submissionId,
          disposition
        }),
      });

      if (response.ok) {
        const actionText = disposition === 'backlog' ? 'Moved to backlog' :
                          disposition === 'archived' ? 'Archived' :
                          `Accepted for ${selectedMonth}`;
        showToastNotification(actionText);
      } else {
        // Revert on failure
        setSubmissions(prev => prev.map(s => 
          s.id === submissionId ? { ...s, disposition: sub.disposition } : s
        ));
        showToastNotification('Failed to update status');
      }
    } catch (err) {
      console.error('Failed to update disposition:', err);
      // Revert on failure
      setSubmissions(prev => prev.map(s => 
        s.id === submissionId ? { ...s, disposition: sub.disposition } : s
      ));
      showToastNotification('Failed to update status');
    }
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/editor', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'saveAllSubmissions', 
          submissions: submissions 
        }),
      });

      if (response.ok) {
        setHasUnsavedChanges(false);
        setPendingChanges([]);
        showToastNotification('Changes saved successfully!');
        // Don't reload - UI already has correct state and server cache is correct
        // Reloading immediately creates race condition with blob propagation
      } else {
        showToastNotification('Failed to save changes');
      }
    } catch (err) {
      console.error('Failed to save changes:', err);
      showToastNotification('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSubmission = async (submissionId: string, preview: string) => {
    if (!confirm(`Are you sure you want to permanently delete this submission?\n\n"${preview.substring(0, 100)}..."\n\nThis cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch('/api/editor', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'deleteSubmission', submissionId }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Update local state immediately
          setSubmissions(prev => prev.filter(s => s.id !== submissionId));
          showToastNotification('Submission deleted');
        } else {
          showToastNotification('Failed to delete submission');
        }
      } else {
        showToastNotification('Failed to delete submission');
      }
    } catch (err) {
      console.error('Failed to delete submission:', err);
      showToastNotification('Error deleting submission');
    }
  };

  const startEditingSubmission = (submissionId: string, content: string) => {
    setEditingSubmission(submissionId);
    
    const lines = content.split('\n');
    const firstLine = lines[0]?.trim() || '';

    let publishedName = '';
    let title = '';

    if (firstLine.startsWith('Title:')) {
      // Committee new format: Title: ... / Author: ...
      title = firstLine.replace(/^Title:\s*/i, '').trim();
      const authorLine = lines.find(l => l.startsWith('Author:'));
      publishedName = authorLine ? authorLine.replace(/^Author:\s*/i, '').trim() : '';
    } else {
      // Community format: "PublishedName - Title" or just "PublishedName"
      const titleMatch = firstLine.match(/^(.+?)\s+-\s+(.+)$/);
      publishedName = titleMatch ? titleMatch[1].trim() : firstLine;
      title = titleMatch ? titleMatch[2].trim() : '';
      publishedName = publishedName.replace(/^Author:\s*/i, '').trim();
    }
    
    // Find metadata lines
    let fullName = '';
    let email = '';
    let location = '';
    let otherMetadata = '';
    let contentStartIndex = 1;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('Full Name:')) {
        fullName = line.replace('Full Name:', '').trim();
      } else if (line.startsWith('Email:')) {
        email = line.replace('Email:', '').trim();
      } else if (line.startsWith('Location:')) {
        location = line.replace('Location:', '').trim();
      } else if (line.includes(':') && i < 10) {
        // Capture other metadata like "In Response To:", "Type:", "Sighting Location:", etc.
        otherMetadata += (otherMetadata ? '\n' : '') + line;
      } else if (line.trim() === '' && i > 1) {
        // Empty line after metadata marks start of content
        const prevHasMetadata = lines[i - 1]?.includes(':');
        if (prevHasMetadata) {
          contentStartIndex = i + 1;
          break;
        }
      }
    }
    
    // Get actual content (everything after metadata block)
    const actualContent = lines.slice(contentStartIndex).join('\n').trim();
    
    setEditForm({
      publishedName,
      title,
      fullName,
      email,
      location,
      actualContent,
      otherMetadata,
    });
  };

  const cancelEditingSubmission = () => {
    setEditingSubmission(null);
    setEditForm({
      publishedName: '',
      title: '',
      fullName: '',
      email: '',
      location: '',
      actualContent: '',
      otherMetadata: '',
    });
  };

  const saveEditedSubmission = async (submissionId: string) => {
    try {
      // Find the submission to update
      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) {
        showToastNotification('Submission not found');
        return;
      }

      // Reconstruct the content string in proper format
      let reconstructedContent = '';
      
      // First line: PublishedName with optional title
      if (editForm.title.trim()) {
        reconstructedContent = `${editForm.publishedName.trim()} - ${editForm.title.trim()}\n\n`;
      } else {
        reconstructedContent = `${editForm.publishedName.trim()}\n\n`;
      }
      
      // Add other metadata if exists (like "In Response To:", "Type:", etc.)
      if (editForm.otherMetadata.trim()) {
        reconstructedContent += `${editForm.otherMetadata.trim()}\n`;
      }
      
      // Add standard metadata
      reconstructedContent += `Full Name: ${editForm.fullName.trim()}\n`;
      reconstructedContent += `Email: ${editForm.email.trim()}\n`;
      if (editForm.location.trim()) {
        reconstructedContent += `Location: ${editForm.location.trim()}\n`;
      }
      
      // Add blank line before content
      reconstructedContent += `\n${editForm.actualContent.trim()}`;

      // Update the submission with new content
      const updatedSubmission = {
        ...submission,
        content: reconstructedContent,
        publishedName: editForm.publishedName.trim(),
      };

      // Save to database
      const allSubs = submissions.map(s => 
        s.id === submissionId ? updatedSubmission : s
      );

      const response = await fetch('/api/editor', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'saveAllSubmissions', submissions: allSubs }),
      });

      if (response.ok) {
        setSubmissions(allSubs);
        setEditingSubmission(null);
        setEditForm({
          publishedName: '',
          title: '',
          fullName: '',
          email: '',
          location: '',
          actualContent: '',
          otherMetadata: '',
        });
        showToastNotification('Submission updated');
      } else {
        showToastNotification('Failed to save changes');
      }
    } catch (err) {
      console.error('Failed to save edited submission:', err);
      showToastNotification('Error saving changes');
    }
  };

  const toggleSubmissionSelection = (submissionId: string) => {
    setSelectedSubmissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(submissionId)) {
        newSet.delete(submissionId);
      } else {
        newSet.add(submissionId);
      }
      return newSet;
    });
  };

  const selectAllVisible = () => {
    const filtered = submissions.filter(s => {
      if (dataViewerFilter === 'all') return true;
      if (dataViewerFilter === 'unreviewed') return !s.disposition || s.disposition === '';
      if (dataViewerFilter === 'backlog') return s.disposition === 'backlog';
      if (dataViewerFilter === 'archived') return s.disposition === 'archived';
      if (dataViewerFilter === 'accepted') return s.disposition && s.disposition !== 'backlog' && s.disposition !== 'archived' && s.disposition !== '';
      return true;
    });
    setSelectedSubmissions(new Set(filtered.map(s => s.id)));
  };

  const clearSelection = () => {
    setSelectedSubmissions(new Set());
  };

  const bulkDelete = async () => {
    if (selectedSubmissions.size === 0) return;

    if (!confirm(`Are you sure you want to permanently delete ${selectedSubmissions.size} submission(s)?\n\nThis cannot be undone.`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedSubmissions).map(submissionId =>
        fetch('/api/editor', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${password}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'deleteSubmission', submissionId }),
        })
      );

      await Promise.all(deletePromises);

      // Update local state
      setSubmissions(prev => prev.filter(s => !selectedSubmissions.has(s.id)));
      
      showToastNotification(`${selectedSubmissions.size} submission(s) deleted`);
      setSelectedSubmissions(new Set());
      setBulkDeleteMode(false);
    } catch (err) {
      console.error('Failed to bulk delete:', err);
      showToastNotification('Error during bulk delete');
    }
  };

  const exportNewsletter = async () => {
    try {
      const response = await fetch('/api/editor', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'export', month: selectedMonth }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Create and download file
        const blob = new Blob([data.text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GRIT-Newsletter-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export:', err);
      alert('Failed to export newsletter');
    }
  };

  const handleMonthChange = async (monthKey: string) => {
    setSelectedMonth(monthKey);
    setCustomOrder([]); // Clear custom order when changing months
    setDismissedMissingCategories(new Set());
    await loadEditorData(monthKey);
  };

  const updateDeadlineDay = async () => {
    if (deadlineDay < 1 || deadlineDay > 28) {
      alert('Please enter a day between 1 and 28');
      return;
    }

    try {
      const response = await fetch('/api/editor', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateDeadline',
          deadlineDay: deadlineDay,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentDeadlineInfo(data.deadlineInfo || {month: '', deadline: ''});
        alert('Deadline updated successfully! The new deadline will be reflected on the homepage.');
        setShowSettings(false);
        await loadEditorData(); // Reload to get updated data
      } else {
        alert('Failed to update deadline');
      }
    } catch (err) {
      console.error('Failed to update deadline:', err);
      alert('An error occurred while updating the deadline');
    }
  };

  const saveCategoryOrder = async (nextOrder: SubmissionCategory[]) => {
    setCategoryOrder(nextOrder);

    try {
      const response = await fetch('/api/editor', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateDefaultCategoryOrder',
          categoryOrder: nextOrder,
        }),
      });

      if (response.ok) {
        showToastNotification('Default issue order saved');
      } else {
        showToastNotification('Failed to save default order');
      }
    } catch (err) {
      console.error('Failed to save category order:', err);
      showToastNotification('Failed to save default order');
    }
  };

  const moveCategoryOrder = (category: SubmissionCategory, direction: -1 | 1) => {
    const currentIndex = categoryOrder.indexOf(category);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= categoryOrder.length) return;

    const nextOrder = [...categoryOrder];
    [nextOrder[currentIndex], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[currentIndex]];
    void saveCategoryOrder(nextOrder);
  };

  const saveDismissedMissingCategories = async (
    nextDismissedCategories: Set<string>,
    successMessage?: string
  ) => {
    const previous = dismissedMissingCategories;
    const nextList = Array.from(nextDismissedCategories)
      .filter(category => ALL_CATEGORIES.includes(category as SubmissionCategory));

    setDismissedMissingCategories(new Set(nextList));

    if (!selectedMonth) return;

    try {
      const response = await fetch('/api/editor', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateDismissedMissingItems',
          month: selectedMonth,
          dismissedMissingCategories: nextList,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const savedCategories = Array.isArray(data.dismissedMissingCategories)
          ? data.dismissedMissingCategories.filter((category: string) => ALL_CATEGORIES.includes(category as SubmissionCategory))
          : nextList;
        setDismissedMissingCategories(new Set(savedCategories));
        if (successMessage) showToastNotification(successMessage);
      } else {
        setDismissedMissingCategories(previous);
        showToastNotification('Failed to save missing item state');
      }
    } catch (err) {
      console.error('Failed to save missing item state:', err);
      setDismissedMissingCategories(previous);
      showToastNotification('Failed to save missing item state');
    }
  };

  const dismissMissingMonthlyCategory = (category: string) => {
    const nextDismissed = new Set(dismissedMissingCategories);
    nextDismissed.add(category);
    void saveDismissedMissingCategories(nextDismissed, 'Missing monthly item cleared');
  };

  const restoreMissingMonthlyCategory = (category: string) => {
    const nextDismissed = new Set(dismissedMissingCategories);
    nextDismissed.delete(category);
    void saveDismissedMissingCategories(nextDismissed, 'Missing monthly item restored');
  };

  const saveDefaultMonthlyCategories = async (nextCategories: SubmissionCategory[]) => {
    setDefaultMonthlyCategories(nextCategories);
    setDismissedMissingCategories(new Set());

    try {
      const response = await fetch('/api/editor', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateDefaultMonthlyItems',
          defaultMonthlyCategories: nextCategories,
        }),
      });

      if (response.ok) {
        if (selectedMonth) {
          await saveDismissedMissingCategories(new Set());
        }
        showToastNotification('Default monthly items saved');
      } else {
        showToastNotification('Failed to save monthly items');
      }
    } catch (err) {
      console.error('Failed to save monthly items:', err);
      showToastNotification('Failed to save monthly items');
    }
  };

  const toggleDefaultMonthlyCategory = (category: SubmissionCategory) => {
    const nextCategories = defaultMonthlyCategories.includes(category)
      ? defaultMonthlyCategories.filter(item => item !== category)
      : [...defaultMonthlyCategories, category];
    void saveDefaultMonthlyCategories(nextCategories);
  };

  const createReminderPlaceholder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reminderTitle.trim()) {
      showToastNotification('Reminder title is required');
      return;
    }

    try {
      const response = await fetch('/api/editor', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createPlaceholder',
          category: reminderCategory,
          title: reminderTitle.trim(),
          notes: reminderNotes.trim(),
          priority: reminderPriority,
          month: selectedMonth,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmissions(prev => [data.submission, ...prev]);
        setReminderTitle('');
        setReminderNotes('');
        setReminderPriority('high');
        setShowReminderForm(false);
        showToastNotification('Reminder placeholder added');
      } else {
        showToastNotification(data.error || 'Failed to add reminder');
      }
    } catch (err) {
      console.error('Failed to add reminder placeholder:', err);
      showToastNotification('Failed to add reminder');
    }
  };

  const exportAllData = async () => {
    try {
      const response = await fetch('/api/backup?action=export', {
        headers: {
          'Authorization': `Bearer ${password}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Create and download file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GRIT-All-Data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export data:', err);
      alert('Failed to export all data');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
        <main className="mx-auto max-w-md px-4 py-20">
          <Header />
          
          <Link 
            href="/"
            className="mb-6 inline-block font-semibold text-orange-700 hover:text-orange-900"
          >
            ← Back to Dashboard
          </Link>

          <div className="rounded-xl bg-white p-8 shadow-xl border-2 border-orange-200">
            <h1 className="mb-6 text-3xl font-bold text-orange-900">
              Editor Dashboard
            </h1>
            <p className="mb-6 text-gray-800">
              This page is for editors only. Please enter the editor password to continue.
            </p>

            <form onSubmit={handleAuth}>
              <div className="mb-4">
                <label className="mb-2 block font-semibold text-orange-900">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border-2 border-orange-200 p-3 text-amber-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none placeholder:text-amber-600"
                  placeholder="Enter editor password"
                />
              </div>

              {authError && (
                <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-gradient-to-r from-orange-600 to-red-600 py-3 font-semibold text-white shadow-lg transition hover:from-orange-700 hover:to-red-700 hover:shadow-xl"
              >
                Access Editor Dashboard
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <main className="mx-auto max-w-7xl px-4 py-12">
        <Header />
        
        <div className="mb-6 flex items-center justify-between">
          <Link 
            href="/"
            className="font-semibold text-orange-700 hover:text-orange-900"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowSettings(true);
                setShowCaptionContest(false);
              }}
              className="rounded-lg bg-gradient-to-r from-gray-600 to-slate-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:from-gray-700 hover:to-slate-700"
              title="Manage settings including submission deadline"
            >
              ⚙️ Settings
            </button>
            <button
              onClick={async () => {
                setShowSettings(false);
                if (!showCaptionContest) {
                  // Load current contest data
                  try {
                    const res = await fetch('/api/editor', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${password}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'getCaptionContest' }),
                    });
                  if (res.ok) {
                      const d = await res.json();
                      applyCaptionContestData(d);
                      setCaptionImagePreview(null);
                    } else {
                      const err = await res.json().catch(() => ({}));
                      showToastNotification('Failed to load caption data: ' + (err.error || `${res.status} ${res.statusText}`));
                    }
                  } catch (e) { console.error(e); showToastNotification('Network error loading caption data'); }
                }
                setShowCaptionContest(!showCaptionContest);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow transition ${captionContest.enabled ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'}`}
              title="Manage Caption Contest"
            >
              🏆 Caption Contest
            </button>
            <button
              onClick={() => {
                setEditorView('planning');
                setShowReminderForm(!showReminderForm);
              }}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:from-blue-700 hover:to-cyan-700"
              title="Add reminder or placeholder"
            >
              {showReminderForm ? 'Hide Reminder' : 'Add Reminder'}
            </button>
            <button
              onClick={() => {
                setEditorView('data');
                setShowJsonViewer(true);
              }}
              className="rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:from-amber-700 hover:to-orange-700"
              title="View raw JSON data"
            >
              {showJsonViewer ? 'Hide Data' : 'View Data'}
            </button>
            <button
              onClick={exportNewsletter}
              className="rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:from-green-700 hover:to-emerald-700"
              title="Export completed newsletter as text file"
            >
              Export Newsletter
            </button>
          </div>
        </div>

        <h1 className="mb-3 text-3xl font-bold text-orange-900">
          Editor Dashboard
        </h1>

        <div className="mb-5 flex flex-wrap gap-2 rounded-xl border-2 border-orange-200 bg-white p-2 shadow">
          {[
            ['inbox', `Inbox (${inboxSubmissions.length})`],
            ['planning', `Issue Planning (${plannedSubmissions.length})`],
            ['preview', 'Preview'],
            ['data', 'Data'],
          ].map(([view, label]) => (
            <button
              key={view}
              type="button"
              onClick={() => {
                setEditorView(view as EditorView);
                if (view === 'preview') setPreviewTab('preview');
                if (view === 'planning') setPreviewTab('flow');
                setShowSettings(false);
                setShowCaptionContest(false);
                setShowJsonViewer(view === 'data');
              }}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                editorView === view
                  ? 'bg-orange-700 text-white shadow'
                  : 'bg-orange-50 text-orange-900 hover:bg-orange-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {showReminderForm && (
          <form
            onSubmit={createReminderPlaceholder}
            className="mb-6 rounded-lg bg-orange-50 border-4 border-orange-500 p-4 shadow-lg"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-orange-950">Add Placeholder</h2>
                <p className="mt-1 text-sm text-gray-700">
                  Adds an orange placeholder directly to Content Flow for this issue.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReminderForm(false)}
                className="rounded bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                  Section
                </label>
                <select
                  value={reminderCategory}
                  onChange={(e) => setReminderCategory(e.target.value as SubmissionCategory)}
                  className="w-full rounded border border-orange-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                >
                  {ALL_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                  Placeholder Title *
                </label>
                <input
                  type="text"
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  required
                  placeholder="e.g. Follow up on tramway article"
                  className="w-full rounded border border-orange-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold uppercase text-gray-600">
                Notes
              </label>
              <textarea
                value={reminderNotes}
                onChange={(e) => setReminderNotes(e.target.value)}
                rows={3}
                placeholder="Short reminder from a meeting, event, or email"
                className="w-full rounded border border-orange-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-600">
                Target issue: <span className="font-semibold text-gray-900">{selectedMonth}</span>
              </p>
              <button
                type="submit"
                className="rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-orange-800"
              >
                Add Placeholder
              </button>
            </div>
          </form>
        )}
        
        {showSettings && (
          <div className="mb-6 rounded-lg bg-white border-2 border-gray-300 p-4 shadow-lg">
            <h2 className="mb-3 text-xl font-bold text-gray-900">Settings</h2>
            
            <div className="mb-6">
              <h3 className="mb-2 text-base font-semibold text-gray-800">Submission Deadline</h3>
              <p className="mb-3 text-sm text-gray-700">
                Current deadline: <strong>{currentDeadlineInfo.deadline}</strong> for the <strong>{currentDeadlineInfo.month}</strong> issue.
              </p>
              
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm font-medium text-gray-800">
                  Day of Month:
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={deadlineDay}
                  onChange={(e) => setDeadlineDay(parseInt(e.target.value))}
                  className="w-16 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-orange-500 focus:outline-none"
                />
                <button
                  onClick={updateDeadlineDay}
                  className="rounded bg-orange-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-orange-700"
                >
                  Update
                </button>
              </div>
              
              <p className="mt-2 text-xs text-gray-600">
                <span className="text-orange-700 font-semibold">Note:</span> Changes may take up to 5 minutes to appear due to caching.
              </p>
            </div>

            <div className="mb-6 border-t border-gray-200 pt-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-gray-800">Default Issue Order</h3>
                <button
                  type="button"
                  onClick={() => void saveCategoryOrder(DEFAULT_CATEGORY_ORDER)}
                  className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Reset
                </button>
              </div>
              <div className="grid gap-2 lg:grid-cols-2">
                {categoryOrder.map((category, index) => (
                  <div key={`${category}-${index}`} className="flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-3 py-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-orange-100 text-xs font-bold text-orange-900">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium text-gray-900">{category}</span>
                    <button
                      type="button"
                      onClick={() => moveCategoryOrder(category, -1)}
                      disabled={index === 0}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Move ${category} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCategoryOrder(category, 1)}
                      disabled={index === categoryOrder.length - 1}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Move ${category} down`}
                    >
                      ↓
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6 border-t border-gray-200 pt-4">
              <h3 className="mb-2 text-base font-semibold text-gray-800">Default Monthly Items</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {categoryOrder.map(category => (
                  <label
                    key={category}
                    className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-2 text-sm font-medium transition ${
                      defaultMonthlyCategories.includes(category)
                        ? 'border-red-200 bg-red-50 text-red-950'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={defaultMonthlyCategories.includes(category)}
                      onChange={() => toggleDefaultMonthlyCategory(category)}
                      className="h-4 w-4 rounded border-gray-300 text-red-700 focus:ring-red-500"
                    />
                    <span>{category}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6 border-t border-gray-200 pt-4">
              <h3 className="mb-2 text-base font-semibold text-gray-800">Database Export</h3>
              <p className="mb-3 text-sm text-gray-700">
                Download all submissions data from the database as a JSON file for backup purposes.
              </p>
              <button
                onClick={exportAllData}
                className="rounded bg-purple-600 hover:bg-purple-700 px-4 py-2 text-sm font-semibold text-white transition"
                title="Download all data from database as JSON"
              >
                📥 Export All Data
              </button>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <button
                onClick={() => {
                  setShowSettings(false);
                }}
                className="rounded bg-gray-400 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-500"
              >
                Close Settings
              </button>
            </div>
          </div>
        )}

        {/* Caption Contest Panel */}
        {showCaptionContest && (
          <div className="mb-6 rounded-lg bg-white border-2 border-yellow-300 p-5 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">🏆 Caption Contest</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Contest Enabled:</span>
                <button
                  type="button"
                  onClick={async () => {
                    const newEnabled = !captionContest.enabled;
                    try {
                      const res = await fetch('/api/editor', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${password}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'setCaptionContest', enabled: newEnabled }),
                      });
                      if (res.ok) {
                        const d = await res.json();
                        applyCaptionContestData(d);
                        showToastNotification(newEnabled ? 'Caption contest enabled' : 'Caption contest disabled');
                      } else {
                        const err = await res.json().catch(() => ({}));
                        showToastNotification('Failed to update: ' + (err.error || `${res.status} ${res.statusText}`));
                      }
                    } catch (e) { console.error(e); showToastNotification('Network error — check console'); }
                  }}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${captionContest.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${captionContest.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className={`text-sm font-semibold ${captionContest.enabled ? 'text-green-700' : 'text-gray-500'}`}>
                  {captionContest.enabled ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Settings */}
              <div>
                <h3 className="mb-3 text-sm font-bold text-gray-700 uppercase">Contest Settings</h3>

                <div className="mb-3">
                  <label className="mb-1 block text-sm font-semibold text-gray-800">Title</label>
                  <input
                    type="text"
                    value={captionContestTitle}
                    onChange={e => setCaptionContestTitle(e.target.value)}
                    placeholder="Caption Contest"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div className="mb-4">
                  <label className="mb-1 block text-sm font-semibold text-gray-800">Description (optional)</label>
                  <textarea
                    value={captionContestDesc}
                    onChange={e => setCaptionContestDesc(e.target.value)}
                    rows={2}
                    placeholder="A brief description shown on the contest page"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-800">Start Date</label>
                    <input
                      type="date"
                      value={captionContestStartDate}
                      onChange={e => setCaptionContestStartDate(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-800">End Date</label>
                    <input
                      type="date"
                      value={captionContestEndDate}
                      onChange={e => setCaptionContestEndDate(e.target.value)}
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <p className="sm:col-span-2 text-xs leading-5 text-gray-500">
                    Entries below are limited to this contest window. If no start date is saved, the editor shows entries since the first day of this month.
                  </p>
                </div>

                <div className="mb-4">
                  <label className="mb-1 block text-sm font-semibold text-gray-800">
                    Contest Image <span className="text-red-600">*</span>
                    <span className="ml-1 text-xs font-normal text-gray-500">(resized to 1200px JPEG on upload)</span>
                  </label>
                  <label className={`mt-1 flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 transition ${
                    captionImageUploading
                      ? 'border-orange-400 bg-orange-100 cursor-wait'
                      : 'border-orange-300 bg-orange-50 hover:border-orange-400 hover:bg-orange-100'
                  }`}>
                    <span className="text-xl">{captionImageUploading ? '⏳' : '📷'}</span>
                    <span className="text-sm font-medium text-orange-800">
                      {captionImageUploading
                        ? 'Uploading image…'
                        : captionContest.imageData
                        ? 'Replace image…'
                        : 'Choose image…'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={captionImageUploading}
                      className="sr-only"
                      onChange={async e => {
                        const file = e.target.files?.[0] ?? null;
                        setCaptionImageFile(file);
                        if (!file) return;
                        try {
                          const resized = await resizeImageToDataUrl(file);
                          setCaptionImagePreview(resized);
                          setCaptionImageUploading(true);
                          const res = await fetch('/api/editor', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${password}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'setCaptionImage', imageData: resized, imageType: 'image/jpeg' }),
                          });
                          setCaptionImageUploading(false);
                          if (res.ok) {
                            setCaptionContest(prev => ({ ...prev, imageData: resized, imageType: 'image/jpeg' }));
                            setCaptionImageFile(null);
                            showToastNotification('Image uploaded ✓');
                          } else {
                            const err = await res.json().catch(() => ({}));
                            showToastNotification('Image upload failed: ' + (err.error || `${res.status} ${res.statusText}`));
                          }
                        } catch {
                          setCaptionImageUploading(false);
                          showToastNotification('Failed to process image');
                        }
                      }}
                    />
                  </label>
                  {(captionImagePreview || captionContest.imageData) && (
                    <div className="mt-2 overflow-hidden rounded-lg border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={captionImagePreview || captionContest.imageData!} alt="Preview" className="max-h-40 w-full object-contain" />
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/editor', {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${password}`, 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'setCaptionContest',
                            enabled: captionContest.enabled,
                            title: captionContestTitle || null,
                            description: captionContestDesc || null,
                            startDate: captionContestStartDate || null,
                            endDate: captionContestEndDate || null,
                          }),
                        });
                        if (res.ok) {
                          const d = await res.json();
                          applyCaptionContestData(d);
                          showToastNotification('Settings saved ✓');
                        } else {
                          const err = await res.json().catch(() => ({}));
                          showToastNotification('Failed to save: ' + (err.error || `${res.status} ${res.statusText}`));
                        }
                      } catch (e) { console.error(e); showToastNotification('Network error — check console'); }
                    }}
                    className="rounded bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
                  >
                    Save Settings
                  </button>
                  {captionContest.imageData && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm('Remove the contest image?')) return;
                        const res = await fetch('/api/editor', {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${password}`, 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'clearCaptionImage' }),
                        });
                        if (res.ok) {
                          setCaptionContest(prev => ({ ...prev, imageData: null, imageType: null }));
                          setCaptionImagePreview(null);
                          showToastNotification('Image removed');
                        }
                      }}
                      className="rounded bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                    >
                      Remove Image
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Entries */}
              <div>
                <div className="mb-3 flex flex-wrap items-start gap-2">
                  <div className="mr-auto">
                    <h3 className="text-sm font-bold text-gray-700 uppercase">
                      Caption Entries ({captionEntries.length})
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Showing entries from {captionEntryWindow.startDate || 'the current contest'}{captionEntryWindow.endDate ? ` through ${captionEntryWindow.endDate}` : ''}.
                    </p>
                  </div>
                  {captionEntries.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(buildCaptionVotingText(captionEntries)).then(
                          () => showToastNotification('Voting list copied ✓'),
                          () => showToastNotification('Copy failed — try selecting and copying manually'),
                        );
                      }}
                      className="rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                    >
                      Copy for Voting
                    </button>
                  )}
                </div>
                {captionEntries.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No entries yet.</p>
                ) : (
                  <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                    {captionEntries.map(entry => (
                      <div key={entry.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-sm font-semibold text-gray-900">&ldquo;{entry.caption}&rdquo;</p>
                        <p className="mt-1 text-xs text-gray-600">
                          <span className="font-medium">Print name:</span> {entry.publishedName}
                          {' · '}<span className="font-medium">Full name:</span> {entry.fullName}
                          {' · '}<span className="font-medium">Location:</span> {entry.location}
                        </p>
                        <p className="text-xs text-gray-400">{entry.email}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 border-t border-gray-200 pt-3">
              <button
                onClick={() => setShowCaptionContest(false)}
                className="rounded bg-gray-400 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-500"
              >
                Close
              </button>
            </div>
          </div>
        )}
        
        {/* Combined Newsletter Issue & Stats Bar */}
        {!showSettings && currentMonth && (
          <div className="mb-4 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-400 px-4 py-2.5 shadow">
            <div className="flex items-center justify-between gap-6">
              {/* Newsletter Issue Selector */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-bold text-orange-900">Issue:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="text-sm font-semibold rounded border-2 border-orange-400 bg-white px-2.5 py-1 text-orange-900 focus:border-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300"
                >
                  {availableMonths.map(month => (
                    <option key={month.key} value={month.key}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Save Button (if needed) */}
              {hasUnsavedChanges && (
                <button
                  onClick={saveChanges}
                  disabled={isSaving}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {isSaving ? 'Saving...' : '💾 Save'}
                </button>
              )}

              {/* Stats */}
              <div className="flex items-center gap-5 flex-1 justify-center">
                <div className="text-center">
                  <p className="text-base font-bold text-orange-900">{submissions.length}</p>
                  <span className="text-xs text-gray-600">Total</span>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-green-700">
                    {submissions.filter(s => s.disposition === selectedMonth).length}
                  </p>
                  <span className="text-xs text-gray-600">Accepted</span>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-yellow-700">
                    {submissions.filter(s => s.disposition === 'backlog').length}
                  </p>
                  <span className="text-xs text-gray-600">Backlog</span>
                </div>
                <div className="text-center">
                  <p className="text-base font-bold text-blue-700">
                    {submissions.filter(s => !s.disposition || s.disposition === '').length}
                  </p>
                  <span className="text-xs text-gray-600">Unreviewed</span>
                </div>
              </div>

              {/* Deadline */}
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-red-700">{currentDeadlineInfo.deadline}</p>
                <span className="text-xs text-gray-600">Deadline</span>
              </div>
            </div>
          </div>
        )}

        {editorView === 'inbox' && (
          <section className="mb-8 rounded-xl border-2 border-blue-200 bg-white p-5 shadow-xl">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-blue-950">Inbox and Backlog</h2>
                <p className="text-sm text-gray-700">New items and held items in one review pane.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-900">
                  {inboxSubmissions.filter(s => s.itemType !== 'placeholder').length} new
                </span>
                <span className="rounded bg-yellow-100 px-3 py-1.5 text-xs font-semibold text-yellow-900">
                  {backlogSubmissions.filter(s => s.itemType !== 'placeholder').length} backlog
                </span>
              </div>
            </div>

            {inboxAndBacklogSubmissions.length === 0 ? (
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-5 text-sm text-blue-950">
                No inbox or backlog submissions.
              </div>
            ) : (
              <div className="space-y-3">
                {inboxAndBacklogSubmissions.map(sub => {
                  const expanded = expandedInboxItems.has(sub.id);
                  const isBacklog = sub.disposition === 'backlog';
                  return (
                    <article
                      key={sub.id}
                      className={`rounded-lg border p-4 ${
                        isBacklog
                          ? 'border-yellow-200 bg-yellow-50'
                          : 'border-blue-200 bg-blue-50'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${
                              isBacklog ? 'bg-yellow-200 text-yellow-950' : 'bg-blue-200 text-blue-950'
                            }`}>
                              {isBacklog ? 'Backlog' : 'New'}
                            </span>
                            <h3 className="min-w-0 flex-1 truncate text-base font-bold text-gray-950">{getSubmissionTitle(sub)}</h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-700">
                            <span>{getSubmissionAuthor(sub)}</span>
                            <span className="text-gray-400">|</span>
                            <span className={isBacklog ? 'font-semibold text-yellow-900' : 'font-semibold text-blue-800'}>{sub.category}</span>
                            <span className="text-gray-400">|</span>
                            <span>{getPublishedWordCount(sub)} words</span>
                            <span className="text-gray-400">|</span>
                            <span>{new Date(sub.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleInboxExpanded(sub.id)}
                          className={`rounded border bg-white px-3 py-1.5 text-xs font-semibold transition ${
                            isBacklog
                              ? 'border-yellow-300 text-yellow-950 hover:bg-yellow-100'
                              : 'border-blue-300 text-blue-900 hover:bg-blue-100'
                          }`}
                        >
                          {expanded ? 'Collapse' : 'Read'}
                        </button>
                      </div>

                      {expanded ? (
                        <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap rounded border border-white bg-white p-3 font-sans text-sm leading-6 text-gray-800">
                          {extractContent(sub.content, sub.category, sub)}
                        </pre>
                      ) : (
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-800">
                          {extractContent(sub.content, sub.category, sub)}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => updateDisposition(sub.id, selectedMonth)}
                          className="rounded bg-green-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-800"
                        >
                          {isBacklog ? `Pull into ${selectedMonth}` : `Plan for ${selectedMonth}`}
                        </button>
                        {!isBacklog && (
                          <button
                            type="button"
                            onClick={() => updateDisposition(sub.id, 'backlog')}
                            className="rounded bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-yellow-700"
                          >
                            Backlog
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => updateDisposition(sub.id, 'archived')}
                          className="rounded bg-gray-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-700"
                        >
                          Archive
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Data Viewer */}
        {editorView === 'data' && showJsonViewer && (
          <div className="mb-8 rounded-xl bg-white p-6 shadow-xl border-2 border-orange-200">
            <h2 className="mb-4 text-2xl font-bold text-orange-900">Data Viewer</h2>
            <div>
              <div className="mb-4 flex gap-4 items-center flex-wrap">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mr-2">Filter by:</label>
                  <select
                    value={dataViewerFilter}
                    onChange={(e) => setDataViewerFilter(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-gray-900"
                  >
                    <option value="all">All Submissions</option>
                    <option value="unreviewed">Unreviewed</option>
                    <option value="backlog">Backlog</option>
                    <option value="archived">Archived</option>
                    <option value="accepted">Accepted (Any Month)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mr-2">Sort by:</label>
                  <select
                    value={dataViewerSort}
                    onChange={(e) => setDataViewerSort(e.target.value as 'newest' | 'oldest')}
                    className="px-3 py-1 border border-gray-300 rounded text-gray-900"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>
                <div className="ml-auto">
                  <button
                    onClick={() => setBulkDeleteMode(!bulkDeleteMode)}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      bulkDeleteMode 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    {bulkDeleteMode ? 'Exit Bulk Mode' : 'Bulk Delete Mode'}
                  </button>
                </div>
              </div>
              
              {bulkDeleteMode && selectedSubmissions.size > 0 && (
                <div className="mb-4 flex gap-3 items-center bg-red-50 border-2 border-red-200 rounded-lg p-3">
                  <span className="font-semibold text-red-900">
                    {selectedSubmissions.size} selected
                  </span>
                  <button
                    onClick={selectAllVisible}
                    className="px-3 py-1 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 text-sm font-semibold"
                  >
                    Select All Visible
                  </button>
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1 rounded bg-gray-100 text-gray-800 hover:bg-gray-200 text-sm font-semibold"
                  >
                    Clear Selection
                  </button>
                  <button
                    onClick={bulkDelete}
                    className="ml-auto px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold"
                  >
                    Delete Selected ({selectedSubmissions.size})
                  </button>
                </div>
              )}
              
              {bulkDeleteMode && selectedSubmissions.size === 0 && (
                <div className="mb-4 flex gap-3 items-center bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                  <span className="text-sm text-blue-900">
                    Click checkboxes to select items for deletion
                  </span>
                  <button
                    onClick={selectAllVisible}
                    className="ml-auto px-3 py-1 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 text-sm font-semibold"
                  >
                    Select All Visible
                  </button>
                </div>
              )}
              <h3 className="mb-3 text-lg font-semibold text-red-800">Submissions ({(() => {
                const filtered = submissions.filter(s => {
                  if (dataViewerFilter === 'all') return true;
                  if (dataViewerFilter === 'unreviewed') return !s.disposition || s.disposition === '';
                  if (dataViewerFilter === 'backlog') return s.disposition === 'backlog';
                  if (dataViewerFilter === 'archived') return s.disposition === 'archived';
                  if (dataViewerFilter === 'accepted') return s.disposition && s.disposition !== 'backlog' && s.disposition !== 'archived' && s.disposition !== '';
                  return true;
                });
                return filtered.length;
              })()})</h3>
              <div className="max-h-96 overflow-auto rounded-lg bg-amber-50 p-4 border border-orange-200 space-y-3">
                  {(() => {
                    const filtered = submissions.filter(s => {
                      if (dataViewerFilter === 'all') return true;
                      if (dataViewerFilter === 'unreviewed') return !s.disposition || s.disposition === '';
                      if (dataViewerFilter === 'backlog') return s.disposition === 'backlog';
                      if (dataViewerFilter === 'archived') return s.disposition === 'archived';
                      if (dataViewerFilter === 'accepted') return s.disposition && s.disposition !== 'backlog' && s.disposition !== 'archived' && s.disposition !== '';
                      return true;
                    });
                    
                    const sorted = [...filtered].sort((a, b) => {
                      const timeA = new Date(a.submittedAt).getTime();
                      const timeB = new Date(b.submittedAt).getTime();
                      return dataViewerSort === 'newest' ? timeB - timeA : timeA - timeB;
                    });
                    
                    if (sorted.length === 0) {
                      return <p className="text-gray-800">No submissions match the current filter</p>;
                    }
                    
                    return sorted.map((sub) => (
                      <div 
                        key={sub.id} 
                        className={`rounded-lg p-3 border transition ${
                          selectedSubmissions.has(sub.id)
                            ? 'bg-red-50 border-red-300'
                            : editingSubmission === sub.id
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-orange-200'
                        }`}
                      >
                        <div className="flex gap-3">
                          {bulkDeleteMode && (
                            <div className="flex items-start pt-1">
                              <input
                                type="checkbox"
                                checked={selectedSubmissions.has(sub.id)}
                                onChange={() => toggleSubmissionSelection(sub.id)}
                                className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="mb-2 flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-orange-900">{sub.category}</span>
                              <span className={`inline-block rounded px-2 py-1 text-xs font-semibold ${
                                sub.disposition === selectedMonth ? 'bg-green-100 text-green-800' :
                                sub.disposition === 'backlog' ? 'bg-yellow-100 text-yellow-800' :
                                sub.disposition === 'archived' ? 'bg-gray-100 text-gray-800' :
                                sub.disposition === 'published' ? 'bg-purple-100 text-purple-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>{sub.disposition || 'unreviewed'}</span>
                              {!bulkDeleteMode && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-600">→</span>
                                  <select
                                    value={sub.disposition || ''}
                                    onChange={(e) => updateDisposition(sub.id, e.target.value)}
                                    className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-900"
                                    title="Reassign status"
                                  >
                                    <option value="">Unreviewed</option>
                                    {availableMonths.map(m => (
                                      <option key={m.key} value={m.key}>{m.label}</option>
                                    ))}
                                    <option value="backlog">Backlog</option>
                                    <option value="archived">Archived</option>
                                  </select>
                                </div>
                              )}
                            </div>
                            
                            {editingSubmission === sub.id ? (
                              <div className="space-y-3 bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                      Published Name *
                                    </label>
                                    <input
                                      type="text"
                                      value={editForm.publishedName}
                                      onChange={(e) => setEditForm({...editForm, publishedName: e.target.value})}
                                      className="w-full px-2 py-1.5 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                      placeholder="Name as it appears in newsletter"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                      Title
                                    </label>
                                    <input
                                      type="text"
                                      value={editForm.title}
                                      onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                                      className="w-full px-2 py-1.5 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                      placeholder="Article title"
                                    />
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                      Full Name *
                                    </label>
                                    <input
                                      type="text"
                                      value={editForm.fullName}
                                      onChange={(e) => setEditForm({...editForm, fullName: e.target.value})}
                                      className="w-full px-2 py-1.5 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                      Email *
                                    </label>
                                    <input
                                      type="email"
                                      value={editForm.email}
                                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                      className="w-full px-2 py-1.5 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                      Location
                                    </label>
                                    <input
                                      type="text"
                                      value={editForm.location}
                                      onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                                      className="w-full px-2 py-1.5 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                    />
                                  </div>
                                </div>
                                
                                {editForm.otherMetadata && (
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                      Additional Metadata
                                    </label>
                                    <textarea
                                      value={editForm.otherMetadata}
                                      onChange={(e) => setEditForm({...editForm, otherMetadata: e.target.value})}
                                      className="w-full h-16 px-2 py-1.5 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-gray-900 bg-white"
                                      placeholder="In Response To:, Type:, etc."
                                    />
                                  </div>
                                )}
                                
                                <div>
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Content *
                                  </label>
                                  <textarea
                                    value={editForm.actualContent}
                                    onChange={(e) => setEditForm({...editForm, actualContent: e.target.value})}
                                    className="w-full h-40 px-3 py-2 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                                    placeholder="The actual submission content..."
                                  />
                                </div>
                                
                                <div className="flex gap-2 pt-2">
                                  <button
                                    onClick={() => saveEditedSubmission(sub.id)}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded transition"
                                  >
                                    💾 Save Changes
                                  </button>
                                  <button
                                    onClick={cancelEditingSubmission}
                                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm font-semibold rounded transition"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="text-sm text-gray-800 line-clamp-2">{sub.content}</div>
                                <div className="mt-2 flex items-center gap-2 flex-wrap">
                                  <button
                                    onClick={() => startEditingSubmission(sub.id, sub.content)}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <span className="text-gray-300">|</span>
                                  <span className="text-xs text-gray-600">
                                    Submitted: {new Date(sub.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <div className="mt-1 text-xs text-gray-600">
                                  ID: {sub.id}
                                  {sub.publishedName && ` | By: ${sub.publishedName}`}
                                </div>
                              </>
                            )}
                            
                            {!bulkDeleteMode && !editingSubmission && sub.disposition === 'archived' && (
                              <button
                                onClick={() => deleteSubmission(sub.id, sub.content)}
                                className="mt-2 rounded px-3 py-1 text-xs font-semibold bg-red-100 text-red-800 hover:bg-red-200 border border-red-300"
                              >
                                Delete Permanently
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
          </div>
        )}

        {/* Caption Entries in View Data */}
        {editorView === 'data' && showJsonViewer && (
          <div className="mb-8 rounded-xl bg-white p-6 shadow-xl border-2 border-yellow-300">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 className="mr-auto text-2xl font-bold text-yellow-900">🏆 Caption Contest Entries</h2>
              {captionEntriesLoaded && captionEntries.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const text = buildCaptionVotingText(captionEntries);
                    navigator.clipboard.writeText(text).then(
                      () => showToastNotification('Voting list copied ✓'),
                      () => showToastNotification('Copy failed — try selecting and copying manually'),
                    );
                  }}
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Copy for Voting
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/editor', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${password}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'getCaptionContest' }),
                    });
                    if (res.ok) {
                      const d = await res.json();
                      applyCaptionContestData(d);
                    } else {
                      showToastNotification('Failed to load caption entries');
                    }
                  } catch { showToastNotification('Network error loading entries'); }
                }}
                className="rounded bg-yellow-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-yellow-700"
              >
                {captionEntriesLoaded ? 'Refresh' : 'Load Entries'}
              </button>
            </div>
            {captionEntriesLoaded ? (
              captionEntries.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No caption entries yet.</p>
              ) : (
                <div className="space-y-3">
                  {captionEntries.map(entry => (
                    <div key={entry.id} className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">&ldquo;{entry.caption}&rdquo;</p>
                          <p className="mt-1 text-xs text-gray-700">
                            <span className="font-medium">Print name:</span> {entry.publishedName}
                            {' · '}<span className="font-medium">Full name:</span> {entry.fullName}
                            {' · '}<span className="font-medium">Location:</span> {entry.location}
                          </p>
                          <p className="text-xs text-gray-500">{entry.email}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            {new Date(entry.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!confirm(`Delete caption entry from ${entry.publishedName}? This cannot be undone.`)) return;
                            try {
                              const res = await fetch('/api/editor', {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${password}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'deleteCaption', captionId: entry.id }),
                              });
                              if (res.ok) {
                                setCaptionEntries(prev => prev.filter(e => e.id !== entry.id));
                                showToastNotification('Entry deleted');
                              } else {
                                const err = await res.json().catch(() => ({}));
                                showToastNotification('Failed to delete: ' + (err.error || `${res.status}`));
                              }
                            } catch { showToastNotification('Network error'); }
                          }}
                          className="flex-shrink-0 rounded px-3 py-1 text-xs font-semibold bg-red-100 text-red-800 hover:bg-red-200 border border-red-300 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-sm text-gray-500 italic">Click &ldquo;Load Entries&rdquo; to view caption contest submissions.</p>
            )}
          </div>
        )}

        {(editorView === 'planning' || editorView === 'preview') && (
          <div className="grid gap-8 xl:grid-cols-[minmax(20rem,0.85fr)_minmax(0,2fr)]">
            <aside className="space-y-5">
              <section className="rounded-xl border-2 border-blue-200 bg-white p-5 shadow-xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-blue-950">Unreviewed</h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReminderForm(true)}
                      className="rounded bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-800"
                    >
                      Add Placeholder
                    </button>
                    <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-900">
                      {inboxSubmissions.length}
                    </span>
                  </div>
                </div>
                <div className="max-h-[30rem] space-y-3 overflow-y-auto pr-1">
                  {inboxSubmissions.length === 0 ? (
                    <p className="rounded border border-blue-100 bg-blue-50 p-3 text-sm text-blue-950">
                      No unreviewed submissions.
                    </p>
                  ) : inboxSubmissions.map(sub => (
                    <article key={sub.id} className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <p className="text-sm font-bold text-gray-950">{getSubmissionTitle(sub)}</p>
                      <p className="mt-1 text-xs text-gray-700">
                        {getSubmissionAuthor(sub)} | {sub.category} | {getPublishedWordCount(sub)} words
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => updateDisposition(sub.id, selectedMonth)}
                          className="rounded bg-green-700 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-green-800"
                        >
                          Plan
                        </button>
                        <button
                          type="button"
                          onClick={() => updateDisposition(sub.id, 'backlog')}
                          className="rounded bg-yellow-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-yellow-700"
                        >
                          Backlog
                        </button>
                        <button
                          type="button"
                          onClick={() => updateDisposition(sub.id, 'archived')}
                          className="rounded bg-gray-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-700"
                        >
                          Archive
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border-2 border-yellow-200 bg-white p-5 shadow-xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-yellow-950">Backlog</h2>
                  <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-900">
                    {backlogSubmissions.length}
                  </span>
                </div>
                <div className="grid max-h-[30rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  {backlogSubmissions.length === 0 ? (
                    <p className="rounded border border-yellow-100 bg-yellow-50 p-3 text-sm text-yellow-950 sm:col-span-2 xl:col-span-1 2xl:col-span-2">
                      No backlogged submissions.
                    </p>
                  ) : backlogSubmissions.map(sub => (
                    <article key={sub.id} className="rounded-lg border border-yellow-200 bg-yellow-50 p-2.5">
                      <div className="flex items-start gap-2">
                        <p className="min-w-0 flex-1 text-sm font-bold leading-5 text-gray-950">{getSubmissionTitle(sub)}</p>
                        <button
                          type="button"
                          onClick={() => updateDisposition(sub.id, 'archived')}
                          className="flex h-6 w-6 items-center justify-center rounded border border-yellow-300 bg-white text-xs font-bold text-yellow-900 transition hover:bg-yellow-100"
                          aria-label={`Archive ${getSubmissionTitle(sub)}`}
                          title="Archive"
                        >
                          ×
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-700">
                        {sub.category} | {getPublishedWordCount(sub)} words
                      </p>
                      <button
                        type="button"
                        onClick={() => updateDisposition(sub.id, selectedMonth)}
                        className="mt-2 rounded bg-green-700 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-green-800"
                      >
                        Pull into Issue
                      </button>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border-2 border-red-200 bg-white p-5 shadow-xl">
                <h2 className="mb-3 text-xl font-bold text-red-950">Missing Monthly Items</h2>
                {missingMonthlyCategories.length === 0 ? (
                  <p className="text-sm text-gray-600">All monthly placeholders have planned content.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {missingMonthlyCategories.map(category => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => (
                          dismissedMissingCategories.has(category)
                            ? restoreMissingMonthlyCategory(category)
                            : dismissMissingMonthlyCategory(category)
                        )}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          dismissedMissingCategories.has(category)
                            ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-800'
                            : 'bg-red-50 text-red-800'
                        }`}
                        title={dismissedMissingCategories.has(category) ? 'Add back to Content Flow' : 'Clear from Content Flow'}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </aside>

            <section className="space-y-6">
              <div className="flex gap-2 border-b-2 border-orange-200">
                <button
                  onClick={() => setPreviewTab('flow')}
                  className={`px-4 py-2 font-semibold transition border-b-2 ${
                    previewTab === 'flow'
                      ? 'border-orange-600 text-orange-900'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Content Flow
                </button>
                <button
                  onClick={() => setPreviewTab('preview')}
                  className={`px-4 py-2 font-semibold transition border-b-2 ${
                    previewTab === 'preview'
                      ? 'border-orange-600 text-orange-900'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Newsletter Preview
                </button>
              </div>

              {previewTab === 'flow' && (
                <ContentFlow
                  submissions={flowSubmissions}
                  selectedMonth={selectedMonth}
                  customOrder={customOrder}
                  categoryOrder={categoryOrder}
                  onMoveToBacklog={(submissionId) => updateDisposition(submissionId, 'backlog')}
                  onDismissMissing={dismissMissingMonthlyCategory}
                  onDismissPlaceholder={(submissionId) => updateDisposition(submissionId, 'archived')}
                  onOrderChange={handleOrderChange}
                />
              )}

              {previewTab === 'preview' && (
                <div className="rounded-xl bg-white p-6 shadow-xl border-2 border-orange-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-orange-900">
                      Full Newsletter Preview
                    </h2>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">
                        {getWordCount(generateFullNewsletterPreview()).toLocaleString()} words
                      </span>
                      <button
                        onClick={copyFullTextToClipboard}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition"
                        title="Copy full text to clipboard"
                      >
                        📋 Copy Text
                      </button>
                    </div>
                  </div>
                  <p className="mb-4 text-gray-700">
                    This preview reflects the order from the Content Flow. Copy this text for InDesign.
                  </p>
                  <div className="rounded-lg bg-amber-50 border-2 border-orange-200 p-6 max-h-[800px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
                      {generateFullNewsletterPreview()}
                    </pre>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Database Status Indicator */}
        {authenticated && (
          <div className="mt-6 flex justify-center">
            {databaseStatus === 'checking' && (
              <div className="rounded-lg bg-gray-100 border border-gray-300 px-4 py-2 flex items-center gap-2">
                <div className="animate-spin h-3 w-3 border-2 border-gray-600 border-t-transparent rounded-full"></div>
                <span className="text-xs text-gray-600">Checking database...</span>
              </div>
            )}
            {databaseStatus === 'connected' && (
              <div className="rounded-lg bg-green-50 border border-green-400 px-4 py-2 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-green-800">Database connected</span>
              </div>
            )}
            {databaseStatus === 'error' && (
              <div className="rounded-lg bg-red-50 border border-red-400 px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500"></div>
                  <span className="text-xs text-red-800">Database error</span>
                  {databaseError && (
                    <span className="text-xs text-red-700">- {databaseError}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Sticky Save Button */}
        {hasUnsavedChanges && (
          <div className="fixed bottom-6 right-6 z-50 max-w-md">
            <div className="bg-white rounded-lg shadow-2xl border-2 border-red-500 overflow-hidden">
              {/* Pending Changes List */}
              {pendingChanges.length > 0 && (
                <div className="bg-red-50 border-b-2 border-red-200 p-3 max-h-48 overflow-y-auto">
                  <div className="text-xs font-semibold text-red-900 mb-2">Pending Changes ({pendingChanges.length}):</div>
                  <div className="space-y-1">
                    {pendingChanges.slice(0, 10).map((change, idx) => (
                      <div key={idx} className="text-xs text-gray-700 flex items-start gap-2">
                        <span className="text-red-600">•</span>
                        <span className="flex-1">
                          <span className="font-semibold">{change.category}:</span> {change.action}
                        </span>
                      </div>
                    ))}
                    {pendingChanges.length > 10 && (
                      <div className="text-xs text-gray-500 italic">
                        ...and {pendingChanges.length - 10} more
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Save Button */}
              <button
                onClick={saveChanges}
                disabled={isSaving}
                className="w-full px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold transition disabled:opacity-50 disabled:cursor-not-allowed text-lg flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>💾 Save All Changes</>
                )}
              </button>
            </div>
          </div>
        )}
        
        {/* Toast Notification */}
        {showToast && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-up">
            <div className="bg-gray-900 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{toastMessage}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
