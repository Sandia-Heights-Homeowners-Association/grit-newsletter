'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ROUTINE_CATEGORIES } from '@/lib/types';
import { ROUTINE_PASSWORD } from '@/lib/constants';

export default function RoutinePage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState(ROUTINE_CATEGORIES[0]);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ROUTINE_PASSWORD) {
      setAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, content }),
      });

      if (response.ok) {
        setSuccess(true);
        setContent('');
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      } else {
        setError('Failed to submit. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <main className="mx-auto max-w-md px-4 py-20">
          <Link 
            href="/"
            className="mb-6 inline-block text-green-600 hover:text-green-800"
          >
            ← Back to Dashboard
          </Link>

          <div className="rounded-lg bg-white p-8 shadow-lg">
            <h1 className="mb-6 text-3xl font-bold text-gray-800">
              Routine Content Submission
            </h1>
            <p className="mb-6 text-gray-600">
              This page is password-protected. Please enter the password to continue.
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
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-green-500 focus:outline-none"
                  placeholder="Enter password"
                />
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white transition hover:bg-green-700"
              >
                Access
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <main className="mx-auto max-w-3xl px-4 py-12">
        <Link 
          href="/"
          className="mb-6 inline-block text-green-600 hover:text-green-800"
        >
          ← Back to Dashboard
        </Link>

        <div className="rounded-lg bg-white p-8 shadow-lg">
          <h1 className="mb-6 text-3xl font-bold text-gray-800">
            Routine Content Submission
          </h1>

          {success && (
            <div className="mb-6 rounded-lg bg-green-50 p-4 text-green-700">
              Submission successful!
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="mb-2 block font-semibold text-gray-700">
                Content Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof ROUTINE_CATEGORIES[number])}
                className="w-full rounded-lg border border-gray-300 p-3 focus:border-green-500 focus:outline-none"
              >
                {ROUTINE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="mb-2 block font-semibold text-gray-700">
                Content *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={15}
                className="w-full rounded-lg border border-gray-300 p-3 font-mono text-sm focus:border-green-500 focus:outline-none"
                placeholder="Enter your content here. For CSV data, paste directly from Excel..."
              />
              <p className="mt-2 text-sm text-gray-500">
                {category === 'ACC Activity Log' || category === 'Security Report' 
                  ? 'You can copy and paste directly from Excel'
                  : category === 'CSC Table' 
                  ? 'Please format as CSV (comma-separated values)'
                  : 'Enter your content as plain text'}
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white transition hover:bg-green-700 disabled:bg-gray-400"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
