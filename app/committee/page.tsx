'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { COMMITTEE_CATEGORIES } from '@/lib/types';
import { COMMITTEE_PASSWORD } from '@/lib/constants';

export default function CommitteePage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState<typeof COMMITTEE_CATEGORIES[number]>(COMMITTEE_CATEGORIES[0]);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === COMMITTEE_PASSWORD) {
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
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
        <main className="mx-auto max-w-md px-4 py-20">
          {/* Logo Header */}
          <div className="mb-8 flex justify-center">
            <div className="relative rounded-lg bg-gradient-to-br from-orange-200 to-red-300 p-1 shadow-lg">
              <div className="flex items-center justify-center rounded-lg bg-white px-8 py-4">
                <div className="text-3xl font-bold text-orange-700">
                  THE GRIT LOGO
                </div>
              </div>
            </div>
          </div>
          
          <Link 
            href="/"
            className="mb-6 inline-block font-semibold text-orange-700 hover:text-orange-900"
          >
            ← Back to Dashboard
          </Link>

          <div className="rounded-xl bg-white p-8 shadow-xl border-2 border-orange-200">
            <h1 className="mb-6 text-3xl font-bold text-orange-900">
              Committee Content Submission
            </h1>
            <p className="mb-6 text-gray-600">
              This page is password-protected. Please enter the password to continue.
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
                  className="w-full rounded-lg border-2 border-orange-200 p-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
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
                className="w-full rounded-lg bg-gradient-to-r from-orange-600 to-red-600 py-3 font-semibold text-white shadow-lg transition hover:from-orange-700 hover:to-red-700 hover:shadow-xl"
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <main className="mx-auto max-w-3xl px-4 py-12">
        {/* Logo Header */}
        <div className="mb-8 flex justify-center">
          <div className="relative rounded-lg bg-gradient-to-br from-orange-200 to-red-300 p-1 shadow-lg">
            <div className="flex items-center justify-center rounded-lg bg-white px-8 py-4">
              <div className="text-3xl font-bold text-orange-700">
                THE GRIT LOGO
              </div>
            </div>
          </div>
        </div>
        
        <Link 
          href="/"
          className="mb-6 inline-block font-semibold text-orange-700 hover:text-orange-900"
        >
          ← Back to Dashboard
        </Link>

        <div className="rounded-xl bg-white p-8 shadow-xl border-2 border-orange-200">
          <h1 className="mb-6 text-3xl font-bold text-orange-900">
            Committee Content Submission
          </h1>

          {success && (
            <div className="mb-6 rounded-lg bg-green-50 p-4 text-green-700">
              Submission successful!
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="mb-2 block font-semibold text-orange-900">
                Committee *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof COMMITTEE_CATEGORIES[number])}
                className="w-full rounded-lg border-2 border-orange-200 p-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
              >
                {COMMITTEE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="mb-2 block font-semibold text-orange-900">
                Committee Report *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={15}
                className="w-full rounded-lg border-2 border-orange-200 p-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
                placeholder="Enter your committee report here..."
              />
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-gradient-to-r from-orange-600 to-red-600 py-3 font-semibold text-white shadow-lg transition hover:from-orange-700 hover:to-red-700 hover:shadow-xl disabled:bg-gray-400"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
