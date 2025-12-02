'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ROUTINE_CATEGORIES } from '@/lib/types';
import { ROUTINE_PASSWORD } from '@/lib/constants';

export default function RoutinePage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState<typeof ROUTINE_CATEGORIES[number]>(ROUTINE_CATEGORIES[0]);
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const createConfetti = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: any) {
      const confetti = (window as any).confetti;
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  };

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
      const fullContent = `Author: ${authorName}\n\n${content}`;
      
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, content: fullContent, publishedName: authorName }),
      });

      if (response.ok) {
        setSuccess(true);
        setContent('');
        setAuthorName('');
        createConfetti();
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
              Routine Content Submission
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
                  className="w-full rounded-lg border-2 border-orange-200 p-3 text-amber-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none placeholder:text-amber-600"
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
    <>
      <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <main className="mx-auto max-w-3xl px-4 py-12">
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
          <h1 className="mb-4 text-3xl font-bold text-orange-900">
            Routine Content Submission
          </h1>
          
          <div className="mb-6 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 p-4 border-2 border-orange-200">
            <p className="text-gray-900 font-medium">
              This form is for routine newsletter content such as President's Message, committee reports, 
              ACC Activity Logs, Security Reports, and other regular newsletter sections.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="mb-2 block font-semibold text-orange-900">
                Submitter Name (will not be published) *
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                required
                className="w-full rounded-lg border-2 border-orange-200 p-3 text-amber-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none placeholder:text-amber-600"
                placeholder="Your name"
              />
            </div>

            <div className="mb-6">
              <label className="mb-2 block font-semibold text-orange-900">
                Content Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof ROUTINE_CATEGORIES[number])}
                className="w-full rounded-lg border-2 border-orange-200 p-3 text-amber-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
              >
                {ROUTINE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="mb-2 block font-semibold text-orange-900">
                Content *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={15}
                className="w-full rounded-lg border-2 border-orange-200 p-3 font-mono text-sm text-amber-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none placeholder:text-amber-600"
                placeholder="Enter your content here. For CSV data, paste directly from Excel..."
              />
              <p className="mt-2 text-sm text-gray-800">
                {category === 'ACC Activity Log' || category === 'Security Report' 
                  ? 'You can copy and paste directly from Excel'
                  : category === 'CSC Table' 
                  ? 'Please format as CSV (comma-separated values)'
                  : 'Enter your content as plain text'}
              </p>
            </div>

            {success && (
              <div className="mb-6 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 p-8 text-center shadow-2xl border-4 border-green-600">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-white mb-2">Success!</h2>
                <p className="text-xl text-white font-semibold">Your routine content has been submitted!</p>
                <button
                  onClick={createConfetti}
                  className="mt-4 rounded-lg bg-white px-6 py-3 font-semibold text-green-700 shadow-lg transition hover:bg-green-50 hover:shadow-xl"
                >
                  🎉 More Confetti
                </button>
              </div>
            )}

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
    </>
  );
}
