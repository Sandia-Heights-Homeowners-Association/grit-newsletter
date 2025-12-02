'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { EDITOR_PASSWORD } from '@/lib/constants';
import { COMMUNITY_CATEGORIES, ROUTINE_CATEGORIES, COMMITTEE_CATEGORIES } from '@/lib/types';
import type { Submission, SectionProgress, SubmissionCategory } from '@/lib/types';

export default function EditorPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [progress, setProgress] = useState<SectionProgress[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SubmissionCategory | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [backlog, setBacklog] = useState<Submission[]>([]);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showJsonViewer, setShowJsonViewer] = useState(false);
  const [currentMonth, setCurrentMonth] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Community Submissions']));

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  // Helper function to extract just the content and published name
  const extractContent = (rawContent: string, publishedName?: string): string => {
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
    
    // Return content with published name if available
    if (publishedName) {
      return `${actualContent}\n—${publishedName}`;
    }
    return actualContent;
  };

  const generateFullNewsletterPreview = (): string => {
    const sections: string[] = [];
    const emptySections: string[] = [];
    
    // Group categories by type
    const categoryGroups = [
      { title: 'COMMUNITY SUBMISSIONS', categories: COMMUNITY_CATEGORIES },
      { title: 'ROUTINE CONTENT', categories: ROUTINE_CATEGORIES },
      { title: 'COMMITTEE REPORTS', categories: COMMITTEE_CATEGORIES },
    ];

    categoryGroups.forEach(group => {
      group.categories.forEach(category => {
        const section = progress.find(p => p.category === category);
        const categorySubs = submissions.filter(s => s.category === category && s.disposition === 'published');
        
        if (categorySubs.length > 0 || section?.editedContent) {
          sections.push(`\n${'='.repeat(60)}\n${category.toUpperCase()}\n${'='.repeat(60)}\n`);
          
          if (section?.editedContent) {
            sections.push(section.editedContent);
          } else {
            const formattedSubs = categorySubs.map(s => extractContent(s.content, s.publishedName));
            sections.push(formattedSubs.join('\n\n---\n\n'));
          }
        } else {
          emptySections.push(category);
        }
      });
    });

    let result = sections.length > 0 
      ? sections.join('\n\n') 
      : '';

    // Add empty sections notice at the end
    if (emptySections.length > 0) {
      result += `\n\n${'='.repeat(60)}\nEMPTY SECTIONS\n${'='.repeat(60)}\n\n`;
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

  const loadEditorData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/editor', {
        headers: {
          'Authorization': `Bearer ${password}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);
        setProgress(data.progress || []);
        setCurrentMonth(data.month || '');
        console.log('Editor data loaded:', { 
          submissions: data.submissions?.length || 0, 
          progress: data.progress?.length || 0,
          month: data.month 
        });
      } else {
        console.error('Failed to load editor data:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('Failed to load editor data:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateDisposition = async (submissionId: string, disposition: 'published' | 'backlogged' | 'archived') => {
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
      }
    } catch (err) {
      console.error('Failed to update disposition:', err);
    }
  };

  const loadCategoryContent = async (category: SubmissionCategory) => {
    setSelectedCategory(category);
    
    // Get current submissions for this category
    const categorySubs = submissions.filter(s => s.category === category);
    const published = categorySubs.filter(s => s.disposition === 'published');
    
    // Concatenate published submissions using clean formatting
    const concatenated = published
      .map(s => extractContent(s.content))
      .join('\n\n---\n\n');
    
    // Check if there's already edited content
    const section = progress.find(p => p.category === category);
    setEditedContent(section?.editedContent || concatenated);

    // Load backlog
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
      }
    } catch (err) {
      console.error('Failed to load backlog:', err);
    }
  };

  const saveSection = async (isComplete: boolean) => {
    if (!selectedCategory) return;

    try {
      const response = await fetch('/api/editor', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${password}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateSection',
          category: selectedCategory,
          isComplete,
          editedContent,
        }),
      });

      if (response.ok) {
        await loadEditorData();
        alert(`Section ${isComplete ? 'completed' : 'saved'} successfully!`);
      }
    } catch (err) {
      console.error('Failed to save section:', err);
      alert('Failed to save section');
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
              width={480} 
              height={120}
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
            width={480} 
            height={120}
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
        
        {currentMonth && (
          <div className="mb-6 rounded-lg bg-amber-100 border-2 border-orange-300 p-4">
            <p className="text-gray-900">
              <span className="font-semibold">Editing month:</span> {currentMonth} | 
              <span className="font-semibold ml-4">Submissions:</span> {submissions.length} | 
              <span className="font-semibold ml-4">Sections:</span> {progress.length}
            </p>
          </div>
        )}

        {/* Newsletter Progress */}
        {progress.length > 0 && (
          <div className="mb-6 rounded-lg bg-white border-2 border-orange-200 p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold text-orange-900">Newsletter Completion Progress</h3>
            <div className="mb-2 flex items-center justify-between text-sm text-gray-800">
              <span>
                {progress.filter(s => s.isComplete).length} of {progress.length} sections complete
              </span>
              <span className="font-semibold text-orange-900">
                {Math.round((progress.filter(s => s.isComplete).length / progress.length) * 100)}%
              </span>
            </div>
            <div className="h-4 w-full rounded-full bg-orange-100 border-2 border-orange-300 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all duration-500"
                style={{ 
                  width: `${Math.round((progress.filter(s => s.isComplete).length / progress.length) * 100)}%` 
                }}
              />
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
                            sub.disposition === 'published' ? 'bg-green-100 text-green-800' :
                            sub.disposition === 'backlogged' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>{sub.disposition}</span>
                        </div>
                        <div className="text-sm text-gray-800 line-clamp-2">{sub.content}</div>
                        <div className="mt-2 text-xs text-gray-600">
                          ID: {sub.id} | {new Date(sub.submittedAt).toLocaleDateString()}
                          {sub.publishedName && ` | By: ${sub.publishedName}`}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-lg font-semibold text-red-800">Section Progress ({progress.length})</h3>
                <div className="max-h-96 overflow-auto rounded-lg bg-amber-50 p-4 border border-orange-200 space-y-2">
                  {progress.length === 0 ? (
                    <p className="text-gray-800">No sections initialized</p>
                  ) : (
                    progress.map((section) => (
                      <div key={section.category} className="rounded-lg bg-white p-3 border border-orange-200">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-orange-900">{section.category}</span>
                          {section.isComplete ? (
                            <span className="text-green-600 text-xl">✓</span>
                          ) : (
                            <span className="text-gray-400 text-xl">○</span>
                          )}
                        </div>
                        {section.editedContent && (
                          <div className="mt-2 text-xs text-gray-600">
                            Has edited content ({section.editedContent.length} chars)
                          </div>
                        )}
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
                        {progress
                          .filter(section => COMMUNITY_CATEGORIES.includes(section.category as any))
                          .map((section) => {
                            const categorySubmissions = submissions.filter(
                              s => s.category === section.category
                            );
                            const publishedCount = categorySubmissions.filter(
                              s => s.disposition === 'published'
                            ).length;

                            return (
                              <button
                                key={section.category}
                                onClick={() => loadCategoryContent(section.category)}
                                className={`w-full rounded-lg p-2 text-left transition ${
                                  selectedCategory === section.category
                                    ? 'bg-orange-100 border-2 border-orange-500'
                                    : 'bg-amber-50 hover:bg-amber-100 border border-orange-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-sm text-orange-900">
                                    {section.category}
                                  </span>
                                  {section.isComplete && (
                                    <span className="text-green-600 text-lg">✓</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-800 mt-1">
                                  {publishedCount} submission{publishedCount !== 1 ? 's' : ''}
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
                        {progress
                          .filter(section => ROUTINE_CATEGORIES.includes(section.category as any))
                          .map((section) => {
                            const categorySubmissions = submissions.filter(
                              s => s.category === section.category
                            );
                            const publishedCount = categorySubmissions.filter(
                              s => s.disposition === 'published'
                            ).length;

                            return (
                              <button
                                key={section.category}
                                onClick={() => loadCategoryContent(section.category)}
                                className={`w-full rounded-lg p-2 text-left transition ${
                                  selectedCategory === section.category
                                    ? 'bg-orange-100 border-2 border-orange-500'
                                    : 'bg-amber-50 hover:bg-amber-100 border border-orange-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-sm text-orange-900">
                                    {section.category}
                                  </span>
                                  {section.isComplete && (
                                    <span className="text-green-600 text-lg">✓</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-800 mt-1">
                                  {publishedCount} submission{publishedCount !== 1 ? 's' : ''}
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
                        {progress
                          .filter(section => COMMITTEE_CATEGORIES.includes(section.category as any))
                          .map((section) => {
                            const categorySubmissions = submissions.filter(
                              s => s.category === section.category
                            );
                            const publishedCount = categorySubmissions.filter(
                              s => s.disposition === 'published'
                            ).length;

                            return (
                              <button
                                key={section.category}
                                onClick={() => loadCategoryContent(section.category)}
                                className={`w-full rounded-lg p-2 text-left transition ${
                                  selectedCategory === section.category
                                    ? 'bg-orange-100 border-2 border-orange-500'
                                    : 'bg-amber-50 hover:bg-amber-100 border border-orange-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-sm text-orange-900">
                                    {section.category}
                                  </span>
                                  {section.isComplete && (
                                    <span className="text-green-600 text-lg">✓</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-800 mt-1">
                                  {publishedCount} submission{publishedCount !== 1 ? 's' : ''}
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
                <h2 className="mb-4 text-2xl font-bold text-orange-900">
                  {selectedCategory}
                </h2>

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
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateDisposition(sub.id, 'published')}
                              className={`rounded px-3 py-1 text-xs font-semibold ${
                                sub.disposition === 'published'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-orange-100 text-orange-800 hover:bg-green-100 border border-orange-300'
                              }`}
                            >
                              Published
                            </button>
                            <button
                              onClick={() => updateDisposition(sub.id, 'backlogged')}
                              className={`rounded px-3 py-1 text-xs font-semibold ${
                                sub.disposition === 'backlogged'
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
                                  ? 'bg-red-600 text-white'
                                  : 'bg-orange-100 text-orange-800 hover:bg-red-100 border border-orange-300'
                              }`}
                            >
                              Archive
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
                            className="rounded bg-yellow-50 p-2 text-sm"
                          >
                            {sub.content.substring(0, 200)}
                            {sub.content.length > 200 ? '...' : ''}
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}

                {/* Concatenated Editor */}
                <div className="mb-6">
                  <h3 className="mb-3 font-semibold text-red-800">
                    Edit Combined Section
                  </h3>
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    rows={20}
                    className="w-full rounded-lg border border-gray-300 p-4 font-mono text-sm text-amber-700 focus:border-blue-500 focus:outline-none placeholder:text-amber-600"
                    placeholder="Published submissions will be concatenated here. You can edit the combined text directly."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    onClick={() => saveSection(false)}
                    className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition hover:bg-blue-700"
                  >
                    Save Progress
                  </button>
                  <button
                    onClick={() => saveSection(true)}
                    className="rounded-lg bg-green-600 px-6 py-2 font-semibold text-white transition hover:bg-green-700"
                  >
                    Mark as Complete
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-white p-6 shadow-xl border-2 border-orange-200">
                <h2 className="mb-4 text-2xl font-bold text-orange-900">
                  Full Newsletter Preview
                </h2>
                <p className="mb-4 text-gray-700">
                  This is a read-only preview of all published content. To edit individual sections, select a category from the left sidebar.
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
      </main>
    </div>
  );
}
