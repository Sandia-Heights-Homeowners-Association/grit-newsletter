'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { EDITOR_PASSWORD } from '@/lib/constants';
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
    
    // Concatenate published submissions
    const concatenated = published.map(s => s.content).join('\n\n---\n\n');
    
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
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
        <main className="mx-auto max-w-md px-4 py-20">
          <Link 
            href="/"
            className="mb-6 inline-block text-red-600 hover:text-red-800"
          >
            ← Back to Dashboard
          </Link>

          <div className="rounded-lg bg-white p-8 shadow-lg">
            <h1 className="mb-6 text-3xl font-bold text-gray-800">
              Editor Dashboard
            </h1>
            <p className="mb-6 text-gray-600">
              This page is for editors only. Please enter the editor password to continue.
            </p>

            <form onSubmit={handleAuth}>
              <div className="mb-4">
                <label className="mb-2 block font-semibold text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-red-500 focus:outline-none"
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
                className="w-full rounded-lg bg-red-600 py-3 font-semibold text-white transition hover:bg-red-700"
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
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      <main className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <Link 
            href="/"
            className="text-red-600 hover:text-red-800"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex gap-2">
            <button
              onClick={createBackup}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              title="Create a timestamped backup of all data"
            >
              Create Backup
            </button>
            <button
              onClick={exportAllData}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
              title="Download all data as JSON"
            >
              Export All Data
            </button>
            <button
              onClick={exportNewsletter}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
              title="Export completed newsletter as text file"
            >
              Export Newsletter
            </button>
          </div>
        </div>

        <h1 className="mb-8 text-4xl font-bold text-gray-800">
          Editor Dashboard
        </h1>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Sections List */}
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-2xl font-bold text-gray-800">
                Sections
              </h2>
              
              {loading ? (
                <p className="text-gray-500">Loading...</p>
              ) : (
                <div className="space-y-2">
                  {progress.map((section) => {
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
                        className={`w-full rounded-lg p-3 text-left transition ${
                          selectedCategory === section.category
                            ? 'bg-red-100 border-2 border-red-500'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">
                            {section.category}
                          </span>
                          {section.isComplete && (
                            <span className="text-green-600 text-xl">✓</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {publishedCount} submission{publishedCount !== 1 ? 's' : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Content Editor */}
          <div className="lg:col-span-2">
            {selectedCategory ? (
              <div className="rounded-lg bg-white p-6 shadow-lg">
                <h2 className="mb-4 text-2xl font-bold text-gray-800">
                  {selectedCategory}
                </h2>

                {/* Individual Submissions */}
                <div className="mb-6">
                  <h3 className="mb-3 font-semibold text-gray-700">
                    Individual Submissions
                  </h3>
                  <div className="max-h-60 space-y-2 overflow-y-auto">
                    {submissions
                      .filter(s => s.category === selectedCategory)
                      .map(sub => (
                        <div
                          key={sub.id}
                          className="rounded border border-gray-200 bg-gray-50 p-3"
                        >
                          <div className="mb-2 text-sm text-gray-700 line-clamp-2">
                            {sub.content}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateDisposition(sub.id, 'published')}
                              className={`rounded px-3 py-1 text-xs font-semibold ${
                                sub.disposition === 'published'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                              }`}
                            >
                              Published
                            </button>
                            <button
                              onClick={() => updateDisposition(sub.id, 'backlogged')}
                              className={`rounded px-3 py-1 text-xs font-semibold ${
                                sub.disposition === 'backlogged'
                                  ? 'bg-yellow-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-yellow-100'
                              }`}
                            >
                              Backlog
                            </button>
                            <button
                              onClick={() => updateDisposition(sub.id, 'archived')}
                              className={`rounded px-3 py-1 text-xs font-semibold ${
                                sub.disposition === 'archived'
                                  ? 'bg-gray-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
                    <details className="rounded border border-gray-300 p-3">
                      <summary className="cursor-pointer font-semibold text-gray-700">
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
                  <h3 className="mb-3 font-semibold text-gray-700">
                    Edit Combined Section
                  </h3>
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    rows={15}
                    className="w-full rounded-lg border border-gray-300 p-3 font-mono text-sm focus:border-red-500 focus:outline-none"
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
              <div className="flex h-96 items-center justify-center rounded-lg bg-white shadow-lg">
                <p className="text-gray-500">
                  Select a section from the list to begin editing
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
