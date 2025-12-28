'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import { ROUTINE_CATEGORIES } from '@/lib/types';

export default function RoutinePage() {
  const router = useRouter();
  const [category, setCategory] = useState<typeof ROUTINE_CATEGORIES[number]>(ROUTINE_CATEGORIES[0]);
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Load confetti script
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

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

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        setContent('');
        setAuthorName('');
        createConfetti();
      } else {
        setError(data.details || data.error || 'Failed to submit. Please try again.');
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <main className="mx-auto max-w-3xl px-4 py-12">
        <Header />
        
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
              <div className="mb-2 flex items-center justify-between">
                <label className="font-semibold text-orange-900">
                  Content *
                </label>
                <span className="text-sm text-gray-600">
                  {content.trim().split(/\s+/).filter(word => word.length > 0).length} words
                </span>
              </div>
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
              <div className="mb-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-100 p-6 text-center border-2 border-green-300">
                <div className="text-2xl mb-1">✓</div>
                <p className="text-base font-bold text-green-900 mb-2">Submitted successfully!</p>
                <button
                  type="button"
                  onClick={createConfetti}
                  className="rounded-lg bg-gradient-to-r from-orange-600 to-red-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-orange-700 hover:to-red-700 hover:shadow-xl"
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
  );
}
