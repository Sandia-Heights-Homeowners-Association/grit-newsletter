'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { EDITOR_PASSWORD } from '@/lib/constants';
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

  // Helper function to extract just the content (no metadata, no names)
  const extractContent = (rawContent: string): string => {
    // Find the actual content after the metadata lines
    const lines = rawContent.split('\n');
    let contentStart = 0;
    
    // Skip metadata lines (Published Name, Full Name, Email, Location, Author)
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '' && i > 0) {
        contentStart = i + 1;
        break;
      }
    }
    
    const actualContent = lines.slice(contentStart).join('\n').trim();
    return actualContent;
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

    // Message from the President
    addSection('President\'s Note', '## Message from the President');
    
    // Board Notes
    addSection('Board Notes', '## Board Notes');
    
    // Office Notes
    addSection('Office Notes', '## Office Notes');
    
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
    
    // ACC Logs
    addSection('ACC Activity Log', '## ACC Logs');
    
    // CSC Logs
    addSection('CSC Table', '## CSC Logs');
    
    // Security Logs
    addSection('Security Report', '## Security Logs');

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === EDITOR_PASSWORD) {
      setAuthenticated(true);
      setAuthError('');
      loadEditorData();
    } else {
      setAuthError('Incorrect password');
    }
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
        setDeadlineDay(data.deadlineDay || 10);
        setCurrentDeadlineInfo(data.deadlineInfo || {month: '', deadline: ''});
        setBlobStatus('connected');
        setBlobError('');
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
    try {
      const response = await fetch('/api/editor', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'updateDisposition', submissionId, disposition }),
      });

      if (response.ok) {
        loadEditorData();
        if (selectedCategory) {
          loadCategoryContent(selectedCategory);
        }
      }
    } catch (err) {
      console.error('Failed to update disposition:', err);
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
          await loadEditorData();
          if (selectedCategory) {
            await loadCategoryContent(selectedCategory);
          }
        } else {
          alert('Failed to delete submission. It may not exist.');
        }
      } else {
        alert('Failed to delete submission. Please try again.');
      }
    } catch (err) {
      console.error('Failed to delete submission:', err);
      alert('An error occurred while deleting. Please try again.');
    }
  };

  const loadCategoryContent = async (category: SubmissionCategory) => {
    setSelectedCategory(category);

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

  const createBackup = async () => {
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'create' }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Backup created successfully!\n${data.backupPath}`);
      } else {
        alert('Failed to create backup');
      }
    } catch (err) {
      console.error('Failed to create backup:', err);
      alert('Failed to create backup');
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
          {/* Logo Header */}
          <div className="mb-8 flex justify-center">
            <Image 
              src="/logo.png" 
              alt="The GRIT Logo" 
              width={400} 
              height={100}
              className="object-contain"
            />
          </div>
          
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
        {/* Logo Header */}
        <div className="mb-8 flex justify-center">
          <Image 
            src="/logo.png" 
            alt="The GRIT Logo" 
            width={400} 
            height={100}
            className="object-contain"
          />
        </div>
        
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
              onClick={createBackup}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:from-blue-700 hover:to-cyan-700"
              title="Create a timestamped backup of all data"
            >
              Create Backup
            </button>
            <button
              onClick={exportAllData}
              className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:from-purple-700 hover:to-pink-700"
              title="Download all data as JSON"
            >
              Export All Data
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
          <div className="mb-6 rounded-lg bg-white border-2 border-gray-300 p-6 shadow-lg">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">Settings</h2>
            
            <div className="mb-6">
              <h3 className="mb-3 text-lg font-semibold text-gray-800">Submission Deadline</h3>
              <p className="mb-4 text-sm text-gray-700">
                The submission deadline determines which month submissions are collected for. 
                Current deadline: <strong>{currentDeadlineInfo.deadline}</strong> for the <strong>{currentDeadlineInfo.month}</strong> issue.
              </p>
              
              <div className="flex items-center gap-4">
                <label className="font-medium text-gray-800">
                  Deadline Day of Month:
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={deadlineDay}
                  onChange={(e) => setDeadlineDay(parseInt(e.target.value))}
                  className="w-20 rounded-lg border-2 border-gray-300 p-2 text-gray-900 focus:border-orange-500 focus:outline-none"
                />
                <button
                  onClick={updateDeadlineDay}
                  className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white transition hover:bg-orange-700"
                >
                  Update Deadline
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="rounded-lg bg-gray-400 px-4 py-2 font-semibold text-white transition hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
              
              <p className="mt-3 text-xs text-gray-600">
                Note: Day must be between 1-28. Recommended: 10th of the month. This affects the homepage deadline display and which month submissions are collected for.
              </p>
            </div>
          </div>
        )}
        
        {/* Stats Bar - only show if not showing settings */}
        {!showSettings && currentMonth && (
          <div className="mb-6 rounded-lg bg-white border-2 border-orange-300 p-4 shadow">
            <div className="flex items-center justify-between">
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
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 text-lg font-semibold text-red-800">Submissions ({submissions.length})</h3>
                <div className="max-h-96 overflow-auto rounded-lg bg-amber-50 p-4 border border-orange-200 space-y-3">
                  {submissions.length === 0 ? (
                    <p className="text-gray-800">No submissions yet</p>
                  ) : (
                    submissions.map((sub) => (
                      <div key={sub.id} className="rounded-lg bg-white p-3 border border-orange-200">
                        <div className="mb-2">
                          <span className="font-semibold text-orange-900">{sub.category}</span>
                          <span className={`ml-2 inline-block rounded px-2 py-1 text-xs font-semibold ${
                            sub.disposition === selectedMonth ? 'bg-green-100 text-green-800' :
                            sub.disposition === 'backlog' ? 'bg-yellow-100 text-yellow-800' :
                            sub.disposition === 'archived' ? 'bg-gray-100 text-gray-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>{sub.disposition || 'unreviewed'}</span>
                        </div>
                        <div className="text-sm text-gray-800 line-clamp-2">{sub.content}</div>
                        <div className="mt-2 text-xs text-gray-600">
                          ID: {sub.id} | {new Date(sub.submittedAt).toISOString().split('T')[0]}
                          {sub.publishedName && ` | By: ${sub.publishedName}`}
                        </div>
                      </div>
                    ))
                  )}
                </div>
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

                {/* Individual Submissions */}
                <div className="mb-6">
                  <h3 className="mb-3 font-semibold text-red-800">
                    Individual Submissions
                  </h3>
                  <div className="max-h-60 space-y-2 overflow-y-auto">
                    {submissions
                      .filter(s => s.category === selectedCategory)
                      .map(sub => (
                        <div
                          key={sub.id}
                          className="rounded border-2 border-orange-200 bg-amber-50 p-3"
                        >
                          <div className="mb-2 text-sm text-gray-800 line-clamp-2">
                            {sub.content}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => updateDisposition(sub.id, selectedMonth)}
                              className={`rounded px-3 py-1 text-xs font-semibold ${
                                sub.disposition === selectedMonth
                                  ? 'bg-green-600 text-white'
                                  : 'bg-orange-100 text-orange-800 hover:bg-green-100 border border-orange-300'
                              }`}
                            >
                              Accept for {selectedMonth}
                            </button>
                            <button
                              onClick={() => updateDisposition(sub.id, 'backlog')}
                              className={`rounded px-3 py-1 text-xs font-semibold ${
                                sub.disposition === 'backlog'
                                  ? 'bg-yellow-600 text-white'
                                  : 'bg-orange-100 text-orange-800 hover:bg-yellow-100 border border-orange-300'
                              }`}
                            >
                              Backlog
                            </button>
                            <button
                              onClick={() => updateDisposition(sub.id, 'archived')}
                              className={`rounded px-3 py-1 text-xs font-semibold ${
                                sub.disposition === 'archived'
                                  ? 'bg-gray-600 text-white'
                                  : 'bg-orange-100 text-orange-800 hover:bg-gray-100 border border-orange-300'
                              }`}
                            >
                              Archive
                            </button>
                            <button
                              onClick={() => deleteSubmission(sub.id, sub.content)}
                              className="rounded px-3 py-1 text-xs font-semibold bg-red-100 text-red-800 hover:bg-red-200 border border-red-300"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Backlog */}
                {backlog.length > 0 && (
                  <div className="mb-6">
                    <details className="rounded border-2 border-orange-200 bg-amber-50 p-3">
                      <summary className="cursor-pointer font-semibold text-orange-900">
                        Backlog from Previous Months ({backlog.length})
                      </summary>
                      <div className="mt-3 space-y-2">
                        {backlog.map(sub => (
                          <div
                            key={sub.id}
                            className="rounded bg-yellow-50 border-2 border-yellow-200 p-3"
                          >
                            <div className="mb-2 text-sm text-gray-800">
                              {sub.content.substring(0, 200)}
                              {sub.content.length > 200 ? '...' : ''}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateDisposition(sub.id, selectedMonth)}
                                className="rounded px-3 py-1 text-xs font-semibold bg-green-100 text-green-800 hover:bg-green-200 border border-green-300"
                              >
                                Accept for {selectedMonth}
                              </button>
                              <button
                                onClick={() => deleteSubmission(sub.id, sub.content)}
                                className="rounded px-3 py-1 text-xs font-semibold bg-red-100 text-red-800 hover:bg-red-200 border border-red-300"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}

                {/* Archived */}
                {archived.length > 0 && (
                  <div className="mb-6">
                    <details className="rounded border-2 border-gray-300 bg-gray-50 p-3">
                      <summary className="cursor-pointer font-semibold text-gray-700">
                        Archived Submissions ({archived.length})
                      </summary>
                      <div className="mt-3 space-y-2">
                        {archived.map(sub => (
                          <div
                            key={sub.id}
                            className="rounded bg-gray-100 border-2 border-gray-200 p-3"
                          >
                            <div className="mb-2 text-sm text-gray-700">
                              {sub.content.substring(0, 200)}
                              {sub.content.length > 200 ? '...' : ''}
                            </div>
                            <button
                              onClick={() => deleteSubmission(sub.id, sub.content)}
                              className="rounded px-3 py-1 text-xs font-semibold bg-red-100 text-red-800 hover:bg-red-200 border border-red-300"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}

                {/* Combined Section Preview */}
                <div className="mb-6">
                  <h3 className="mb-3 font-semibold text-red-800">
                    Combined Section Preview
                  </h3>
                  <div className="rounded-lg bg-amber-50 border-2 border-orange-200 p-4 max-h-[600px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
                      {submissions
                        .filter(s => s.category === selectedCategory && s.disposition === selectedMonth)
                        .map(s => extractContent(s.content))
                        .join('\\n\\n---\\n\\n') || 'No submissions accepted for this month yet.'}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-white p-6 shadow-xl border-2 border-orange-200">
                <h2 className="mb-4 text-2xl font-bold text-orange-900">
                  Full Newsletter Preview
                </h2>
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
      </main>
    </div>
  );
}
