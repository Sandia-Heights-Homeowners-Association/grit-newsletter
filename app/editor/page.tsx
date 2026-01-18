'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/app/components/Header';
import { COMMUNITY_CATEGORIES, ROUTINE_CATEGORIES, COMMITTEE_CATEGORIES } from '@/lib/types';
import type { Submission, SubmissionCategory } from '@/lib/types';

export default function EditorPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SubmissionCategory | null>(null);
  const [backlog, setBacklog] = useState<Submission[]>([]);
  const [archived, setArchived] = useState<Submission[]>([]);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showJsonViewer, setShowJsonViewer] = useState(false);
  const [currentMonth, setCurrentMonth] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Community Submissions']));
  const [blobStatus, setBlobStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [blobError, setBlobError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
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

  const showToastNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Helper function to extract just the content that will be published
  const extractContent = (rawContent: string): string => {
    const lines = rawContent.split('\n');
    
    // First line has: "PublishedName - Title" or just "PublishedName"
    const firstLine = lines[0] || '';
    const titleMatch = firstLine.match(/^(.+?)\s*-\s*(.+)$/);
    
    let publishedName = '';
    let title = '';
    
    if (titleMatch) {
      publishedName = titleMatch[1].trim();
      title = titleMatch[2].trim();
    } else {
      publishedName = firstLine.trim();
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
    
    // Format for publication: Author name, optional title, then content
    let result = '';
    if (title) {
      result = `${publishedName}\n\n${title}\n\n${actualContent}`;
    } else {
      result = `${publishedName}\n\n${actualContent}`;
    }
    
    return result;
  };

  const generateFullNewsletterPreview = (): string => {
    const sections: string[] = [];
    const emptySections: string[] = [];
    
    // Helper to add section content
    const addSection = (category: SubmissionCategory, heading: string) => {
      const categorySubs = submissions.filter(s => 
        s.category === category && s.disposition === selectedMonth
      );
      
      if (categorySubs.length > 0) {
        sections.push(`\n${heading}\n`);
        const formattedSubs = categorySubs.map(s => extractContent(s.content));
        sections.push(formattedSubs.join('\n\n'));
      } else {
        emptySections.push(category);
      }
    };

    // Routine Content
    addSection('President\'s Note', '## Message from the President');
    addSection('Board Notes', '## Board Notes');
    addSection('Office Notes', '## Office Notes');
    addSection('ACC Activity Log', '## ACC Logs');
    addSection('CSC Table', '## CSC Logs');
    addSection('Security Report', '## Security Logs');
    addSection('Association Events', '## Association Events');
    
    // Community Contributions header
    const communityHasContent = COMMUNITY_CATEGORIES.some(cat => {
      const categorySubs = submissions.filter(s => s.category === cat && s.disposition === selectedMonth);
      return categorySubs.length > 0;
    });
    
    if (communityHasContent) {
      sections.push('\n## Community Contributions\n');
    }
    
    // Community categories as H4
    COMMUNITY_CATEGORIES.forEach(cat => addSection(cat, `#### ${cat}`));
    
    // Committee Content header
    const committeeHasContent = COMMITTEE_CATEGORIES.some(cat => {
      const categorySubs = submissions.filter(s => s.category === cat && s.disposition === selectedMonth);
      return categorySubs.length > 0;
    });
    
    if (committeeHasContent) {
      sections.push('\n## Committee Content\n');
    }
    
    // Committee categories as H4
    COMMITTEE_CATEGORIES.forEach(cat => addSection(cat, `#### ${cat}`));

    let result = sections.length > 0 
      ? sections.join('\n\n') 
      : '';

    // Add empty sections notice at the end
    if (emptySections.length > 0) {
      result += `\n\n## List of Empty Sections\n\n`;
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
    setBlobStatus('checking');
    try {
      const url = monthKey ? `/api/editor?month=${monthKey}` : '/api/editor';
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${password}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);
        setCurrentMonth(data.month || '');
        setSelectedMonth(data.month || '');
        setAvailableMonths(data.availableMonths || []);
        setDeadlineDay(data.deadlineDay || 20);
        setCurrentDeadlineInfo(data.deadlineInfo || {month: '', deadline: ''});
        setBlobStatus('connected');
        setBlobError('');
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
        setBlobStatus('error');
        setBlobError(errorData.error || 'Failed to load data');
        setAuthError(response.status === 401 ? 'Incorrect password' : 'Failed to load data');
      }
    } catch (err) {
      console.error('Failed to load editor data:', err);
      setBlobStatus('error');
      setBlobError(err instanceof Error ? err.message : 'Network error');
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
    
    // Update backlog array if needed
    if (disposition === 'backlog') {
      if (!backlog.find(b => b.id === submissionId)) {
        setBacklog(prev => [...prev, { ...sub, disposition }]);
      }
    } else {
      setBacklog(prev => prev.filter(b => b.id !== submissionId));
    }
    
    // Update archived array if needed
    if (disposition === 'archived') {
      if (!archived.find(a => a.id === submissionId)) {
        setArchived(prev => [...prev, { ...sub, disposition }]);
      }
    } else {
      setArchived(prev => prev.filter(a => a.id !== submissionId));
    }

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
        
        // Reload backlog/archived for this category to ensure consistency
        if (selectedCategory) {
          await loadCategoryContent(selectedCategory);
        }
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
          setBacklog(prev => prev.filter(b => b.id !== submissionId));
          setArchived(prev => prev.filter(a => a.id !== submissionId));
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
      setBacklog(prev => prev.filter(b => !selectedSubmissions.has(b.id)));
      setArchived(prev => prev.filter(a => !selectedSubmissions.has(a.id)));
      
      showToastNotification(`${selectedSubmissions.size} submission(s) deleted`);
      setSelectedSubmissions(new Set());
      setBulkDeleteMode(false);
    } catch (err) {
      console.error('Failed to bulk delete:', err);
      showToastNotification('Error during bulk delete');
    }
  };

  const loadCategoryContent = async (category: SubmissionCategory) => {
    setSelectedCategory(category);
    
    // Debug: log submissions for this category
    const categorySubmissions = submissions.filter(s => s.category === category);
    console.log('Loading category:', category);
    console.log('Submissions for category:', categorySubmissions.length);
    console.log('Category submissions:', categorySubmissions.map(s => ({
      id: s.id.substring(0, 8),
      disposition: s.disposition,
      month: s.month
    })));

    // Load backlog and archived
    try {
      const response = await fetch('/api/editor', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'getBacklog', category }),
      });

      if (response.ok) {
        const data = await response.json();
        setBacklog(data.backlog || []);
        setArchived(data.archived || []);
        console.log('Backlog loaded:', data.backlog?.length || 0);
        console.log('Archived loaded:', data.archived?.length || 0);
      }
    } catch (err) {
      console.error('Failed to load backlog:', err);
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
        body: JSON.stringify({ action: 'export' }),
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
    setSelectedCategory(null); // Clear selected category when changing months
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
              onClick={() => setShowSettings(!showSettings)}
              className="rounded-lg bg-gradient-to-r from-gray-600 to-slate-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:from-gray-700 hover:to-slate-700"
              title="Manage settings including submission deadline"
            >
              ⚙️ Settings
            </button>
            <button
              onClick={() => setShowJsonViewer(!showJsonViewer)}
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

        <h1 className="mb-8 text-4xl font-bold text-orange-900">
          Editor Dashboard
        </h1>
        
        {/* Month Selector */}
        <div className="mb-6 rounded-xl bg-gradient-to-r from-orange-100 to-amber-100 border-2 border-orange-400 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-orange-900 mb-2">Select Newsletter Issue</h2>
              <p className="text-sm text-gray-700">
                Choose which month's content you want to edit. The current collection month (based on deadline) is pre-selected.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-lg font-semibold text-orange-900">
                Editing:
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="text-lg font-semibold rounded-lg border-2 border-orange-400 bg-white px-4 py-3 text-orange-900 focus:border-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300 min-w-[250px]"
              >
                {availableMonths.map(month => (
                  <option key={month.key} value={month.key}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
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
                onClick={() => setShowSettings(false)}
                className="rounded bg-gray-400 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-500"
              >
                Close Settings
              </button>
            </div>
          </div>
        )}
        
        {/* Stats Bar - only show if not showing settings */}
        {!showSettings && currentMonth && (
          <div className="mb-6 rounded-lg bg-white border-2 border-orange-300 p-4 shadow">
            <div className="flex items-center justify-between">
              {hasUnsavedChanges && (
                <div className="flex-shrink-0 mr-6">
                  <button
                    onClick={saveChanges}
                    disabled={isSaving}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : '💾 Save All Changes'}
                  </button>
                  <div className="text-xs text-red-600 mt-1 font-semibold">Unsaved changes</div>
                </div>
              )}
              <div className="flex gap-6">
                <div>
                  <span className="text-sm text-gray-600">Total Submissions</span>
                  <p className="text-2xl font-bold text-orange-900">{submissions.length}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Accepted for {selectedMonth}</span>
                  <p className="text-2xl font-bold text-green-700">
                    {submissions.filter(s => s.disposition === selectedMonth).length}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Backlogged</span>
                  <p className="text-2xl font-bold text-yellow-700">
                    {submissions.filter(s => s.disposition === 'backlog').length}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Unreviewed</span>
                  <p className="text-2xl font-bold text-blue-700">
                    {submissions.filter(s => !s.disposition || s.disposition === '').length}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-600">Current Collection Deadline</span>
                <p className="text-lg font-semibold text-red-700">{currentDeadlineInfo.deadline}</p>
              </div>
            </div>
          </div>
        )}

        {/* Data Viewer */}
        {showJsonViewer && (
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
                            <div className="text-sm text-gray-800 line-clamp-2">{sub.content}</div>
                            <div className="mt-2 text-xs text-gray-600">
                              Submitted: {new Date(sub.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="mt-1 text-xs text-gray-600">
                              ID: {sub.id}
                              {sub.publishedName && ` | By: ${sub.publishedName}`}
                            </div>
                            {!bulkDeleteMode && sub.disposition === 'archived' && (
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

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Sections List */}
          <div className="lg:col-span-1">
            <div className="rounded-xl bg-white p-6 shadow-xl border-2 border-orange-200">
              <h2 className="mb-4 text-2xl font-bold text-orange-900">
                Sections
              </h2>
              
              {loading ? (
                <p className="text-gray-800">Loading...</p>
              ) : (
                <div className="space-y-3">
                  {/* Community Submissions */}
                  <div className="border-2 border-orange-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleGroup('Community Submissions')}
                      className="w-full bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 p-3 text-left transition flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <span className="font-bold text-orange-900">Community Submissions</span>
                        <div className="text-xs text-gray-700 mt-1">
                          {submissions.filter(s => COMMUNITY_CATEGORIES.includes(s.category as any)).length} total
                        </div>
                      </div>
                      <span className="text-orange-700 text-xl ml-2">
                        {expandedGroups.has('Community Submissions') ? '▼' : '▶'}
                      </span>
                    </button>
                    {expandedGroups.has('Community Submissions') && (
                      <div className="bg-white p-2 space-y-1">
                        {COMMUNITY_CATEGORIES.map((category) => {
                            const categorySubmissions = submissions.filter(
                              s => s.category === category
                            );
                            const acceptedCount = categorySubmissions.filter(
                              s => s.disposition === selectedMonth
                            ).length;
                            const backlogCount = categorySubmissions.filter(
                              s => s.disposition === 'backlog'
                            ).length;
                            const unreviewed = categorySubmissions.filter(
                              s => !s.disposition || s.disposition === ''
                            ).length;

                            return (
                              <button
                                key={category}
                                onClick={() => loadCategoryContent(category)}
                                className={`w-full rounded-lg p-2 text-left transition ${
                                  selectedCategory === category
                                    ? 'bg-orange-100 border-2 border-orange-500'
                                    : 'bg-amber-50 hover:bg-amber-100 border border-orange-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-sm text-orange-900">
                                    {category}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-800 mt-1">
                                  {unreviewed > 0 && <span className="text-blue-700">{unreviewed} new</span>}
                                  {unreviewed > 0 && (acceptedCount > 0 || backlogCount > 0) && <span> | </span>}
                                  {acceptedCount > 0 && <span className="text-green-700">{acceptedCount} accepted</span>}
                                  {acceptedCount > 0 && backlogCount > 0 && <span> | </span>}
                                  {backlogCount > 0 && <span className="text-yellow-700">{backlogCount} backlog</span>}
                                  {unreviewed === 0 && acceptedCount === 0 && backlogCount === 0 && <span className="text-gray-500">no submissions</span>}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Routine Content */}
                  <div className="border-2 border-orange-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleGroup('Routine Content')}
                      className="w-full bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 p-3 text-left transition flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <span className="font-bold text-orange-900">Routine Content</span>
                        <div className="text-xs text-gray-700 mt-1">
                          {submissions.filter(s => ROUTINE_CATEGORIES.includes(s.category as any)).length} total
                        </div>
                      </div>
                      <span className="text-orange-700 text-xl ml-2">
                        {expandedGroups.has('Routine Content') ? '▼' : '▶'}
                      </span>
                    </button>
                    {expandedGroups.has('Routine Content') && (
                      <div className="bg-white p-2 space-y-1">
                        {ROUTINE_CATEGORIES.map((category) => {
                            const categorySubmissions = submissions.filter(
                              s => s.category === category
                            );
                            const acceptedCount = categorySubmissions.filter(
                              s => s.disposition === selectedMonth
                            ).length;
                            const backlogCount = categorySubmissions.filter(
                              s => s.disposition === 'backlog'
                            ).length;
                            const unreviewed = categorySubmissions.filter(
                              s => !s.disposition || s.disposition === ''
                            ).length;

                            return (
                              <button
                                key={category}
                                onClick={() => loadCategoryContent(category)}
                                className={`w-full rounded-lg p-2 text-left transition ${
                                  selectedCategory === category
                                    ? 'bg-orange-100 border-2 border-orange-500'
                                    : 'bg-amber-50 hover:bg-amber-100 border border-orange-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-sm text-orange-900">
                                    {category}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-800 mt-1">
                                  {unreviewed > 0 && <span className="text-blue-700">{unreviewed} new</span>}
                                  {unreviewed > 0 && (acceptedCount > 0 || backlogCount > 0) && <span> | </span>}
                                  {acceptedCount > 0 && <span className="text-green-700">{acceptedCount} accepted</span>}
                                  {acceptedCount > 0 && backlogCount > 0 && <span> | </span>}
                                  {backlogCount > 0 && <span className="text-yellow-700">{backlogCount} backlog</span>}
                                  {unreviewed === 0 && acceptedCount === 0 && backlogCount === 0 && <span className="text-gray-500">no submissions</span>}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Committee Content */}
                  <div className="border-2 border-orange-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleGroup('Committee Content')}
                      className="w-full bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 p-3 text-left transition flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <span className="font-bold text-orange-900">Committee Content</span>
                        <div className="text-xs text-gray-700 mt-1">
                          {submissions.filter(s => COMMITTEE_CATEGORIES.includes(s.category as any)).length} total
                        </div>
                      </div>
                      <span className="text-orange-700 text-xl ml-2">
                        {expandedGroups.has('Committee Content') ? '▼' : '▶'}
                      </span>
                    </button>
                    {expandedGroups.has('Committee Content') && (
                      <div className="bg-white p-2 space-y-1">
                        {COMMITTEE_CATEGORIES.map((category) => {
                            const categorySubmissions = submissions.filter(
                              s => s.category === category
                            );
                            const acceptedCount = categorySubmissions.filter(
                              s => s.disposition === selectedMonth
                            ).length;
                            const backlogCount = categorySubmissions.filter(
                              s => s.disposition === 'backlog'
                            ).length;
                            const unreviewed = categorySubmissions.filter(
                              s => !s.disposition || s.disposition === ''
                            ).length;

                            return (
                              <button
                                key={category}
                                onClick={() => loadCategoryContent(category)}
                                className={`w-full rounded-lg p-2 text-left transition ${
                                  selectedCategory === category
                                    ? 'bg-orange-100 border-2 border-orange-500'
                                    : 'bg-amber-50 hover:bg-amber-100 border border-orange-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-sm text-orange-900">
                                    {category}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-800 mt-1">
                                  {unreviewed > 0 && <span className="text-blue-700">{unreviewed} new</span>}
                                  {unreviewed > 0 && (acceptedCount > 0 || backlogCount > 0) && <span> | </span>}
                                  {acceptedCount > 0 && <span className="text-green-700">{acceptedCount} accepted</span>}
                                  {acceptedCount > 0 && backlogCount > 0 && <span> | </span>}
                                  {backlogCount > 0 && <span className="text-yellow-700">{backlogCount} backlog</span>}
                                  {unreviewed === 0 && acceptedCount === 0 && backlogCount === 0 && <span className="text-gray-500">no submissions</span>}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content Editor */}
          <div className="lg:col-span-2">
            {selectedCategory ? (
              <div className="rounded-xl bg-white p-6 shadow-xl border-2 border-orange-200">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-orange-900">
                    {selectedCategory}
                  </h2>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
                  >
                    ← Back to Full Preview
                  </button>
                </div>

                {/* 1. Unreviewed Submissions */}
                {submissions.filter(s => s.category === selectedCategory && (!s.disposition || s.disposition === '')).length > 0 && (
                  <div className="mb-6">
                    <details open className="rounded border-2 border-blue-300 bg-blue-50 p-3">
                      <summary className="cursor-pointer font-semibold text-blue-900">
                        Unreviewed Submissions ({submissions.filter(s => s.category === selectedCategory && (!s.disposition || s.disposition === '')).length})
                      </summary>
                      <div className="mt-3 space-y-2">
                        {submissions
                          .filter(s => s.category === selectedCategory && (!s.disposition || s.disposition === ''))
                          .map(sub => (
                            <div
                              key={sub.id}
                              className="rounded bg-white border-2 border-blue-200 p-3"
                            >
                              <div className="mb-2 text-sm text-gray-800 line-clamp-3">
                                {sub.content}
                              </div>
                              <div className="mb-2 text-xs text-gray-500">
                                Submitted: {new Date(sub.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                <button
                                  onClick={() => updateDisposition(sub.id, selectedMonth)}
                                  className="rounded px-3 py-1 text-xs font-semibold bg-green-100 text-green-800 hover:bg-green-200 border border-green-300"
                                >
                                  Accept for {selectedMonth}
                                </button>
                                <button
                                  onClick={() => updateDisposition(sub.id, 'backlog')}
                                  className="rounded px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300"
                                >
                                  Backlog
                                </button>
                                <button
                                  onClick={() => updateDisposition(sub.id, 'archived')}
                                  className="rounded px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300"
                                >
                                  Archive
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </details>
                  </div>
                )}

                {/* 2. Backlog from Previous Months */}
                {backlog.length > 0 && (
                  <div className="mb-6">
                    <details className="rounded border-2 border-yellow-300 bg-yellow-50 p-3">
                      <summary className="cursor-pointer font-semibold text-yellow-900">
                        Backlog from Previous Months ({backlog.length})
                      </summary>
                      <div className="mt-3 space-y-2">
                        {backlog.map(sub => (
                          <div
                            key={sub.id}
                            className="rounded bg-white border-2 border-yellow-200 p-3"
                          >
                            <div className="mb-2 text-sm text-gray-800">
                              {sub.content.substring(0, 200)}
                              {sub.content.length > 200 ? '...' : ''}
                            </div>
                            <div className="mb-2 text-xs text-gray-500">
                              Submitted: {new Date(sub.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateDisposition(sub.id, selectedMonth)}
                                className="rounded px-3 py-1 text-xs font-semibold bg-green-100 text-green-800 hover:bg-green-200 border border-green-300"
                              >
                                Accept for {selectedMonth}
                              </button>
                              <button
                                onClick={() => updateDisposition(sub.id, 'archived')}
                                className="rounded px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300"
                              >
                                Archive
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}

                {/* 3. Queued Submissions for This Month */}
                {submissions.filter(s => s.category === selectedCategory && s.disposition === selectedMonth && !backlog.some(b => b.id === s.id)).length > 0 && (
                  <div className="mb-6">
                    <div className="rounded border-2 border-green-300 bg-green-50 p-4">
                      <h3 className="mb-3 font-semibold text-green-900">
                        Accepted for {selectedMonth} ({submissions.filter(s => s.category === selectedCategory && s.disposition === selectedMonth && !backlog.some(b => b.id === s.id)).length})
                      </h3>
                      <div className="space-y-2">
                        {submissions
                          .filter(s => s.category === selectedCategory && s.disposition === selectedMonth && !backlog.some(b => b.id === s.id))
                          .map(sub => (
                            <div
                              key={sub.id}
                              className="rounded bg-white border border-green-200 p-3"
                            >
                              <div className="text-sm text-gray-800 line-clamp-2 mb-2">
                                {extractContent(sub.content)}
                              </div>
                              <div className="mb-2 text-xs text-gray-500">
                                Submitted: {new Date(sub.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <button
                                onClick={() => updateDisposition(sub.id, 'backlog')}
                                className="rounded px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300"
                              >
                                Move to Backlog
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}



                {/* 4. Combined Section Preview */}
                <div className="mb-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-red-800">
                      Combined Section Preview
                    </h3>
                    {(() => {
                      const combinedText = submissions
                        .filter(s => s.category === selectedCategory && s.disposition === selectedMonth && !backlog.some(b => b.id === s.id))
                        .map(s => extractContent(s.content))
                        .join('\n\n---\n\n');
                      const wordCount = combinedText.trim().split(/\s+/).filter(w => w.length > 0).length;
                      const charCount = combinedText.length;
                      return (
                        <div className="text-sm text-gray-600">
                          {wordCount} words | {charCount} characters
                        </div>
                      );
                    })()}
                  </div>
                  <div className="rounded-lg bg-amber-50 border-2 border-orange-200 p-4 max-h-[600px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
                      {submissions
                        .filter(s => s.category === selectedCategory && s.disposition === selectedMonth && !backlog.some(b => b.id === s.id))
                        .map(s => extractContent(s.content))
                        .join('\n\n---\n\n') || 'No submissions accepted for this month yet.'}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
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
                  This is a read-only preview of all content accepted for {selectedMonth}. To view individual sections, select a category from the left sidebar.
                </p>
                <div className="rounded-lg bg-amber-50 border-2 border-orange-200 p-6 max-h-[800px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
                    {generateFullNewsletterPreview()}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Blob Storage Status Indicator */}
        {authenticated && (
          <div className="mt-6 flex justify-center">
            {blobStatus === 'checking' && (
              <div className="rounded-lg bg-gray-100 border border-gray-300 px-4 py-2 flex items-center gap-2">
                <div className="animate-spin h-3 w-3 border-2 border-gray-600 border-t-transparent rounded-full"></div>
                <span className="text-xs text-gray-600">Checking blob storage...</span>
              </div>
            )}
            {blobStatus === 'connected' && (
              <div className="rounded-lg bg-green-50 border border-green-400 px-4 py-2 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-green-800">Blob storage connected</span>
              </div>
            )}
            {blobStatus === 'error' && (
              <div className="rounded-lg bg-red-50 border border-red-400 px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500"></div>
                  <span className="text-xs text-red-800">Blob storage error</span>
                  {blobError && (
                    <span className="text-xs text-red-700">- {blobError}</span>
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
