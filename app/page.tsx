'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { COMMUNITY_CATEGORIES, ROUTINE_CATEGORIES, COMMITTEE_CATEGORIES } from '@/lib/types';
import { APP_NAME, APP_SUBTITLE, getNextPublicationInfo } from '@/lib/constants';

export default function Home() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [completion, setCompletion] = useState(0);
  const { month, deadline } = getNextPublicationInfo();

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data.stats || {});
        setCompletion(data.completion || 0);
      })
      .catch(err => console.error('Failed to load stats:', err));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <main className="mx-auto max-w-6xl px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-2 text-5xl font-bold text-blue-900">{APP_NAME}</h1>
          <p className="text-xl text-blue-700">{APP_SUBTITLE}</p>
          <p className="mt-4 text-lg text-gray-600">
            Sandia Heights Homeowners Association Newsletter
          </p>
        </div>

        {/* Navigation to protected pages */}
        <div className="mb-8 flex justify-center gap-4">
          <Link 
            href="/routine"
            className="rounded-lg bg-green-600 px-6 py-2 text-white transition hover:bg-green-700"
          >
            Routine Content
          </Link>
          <Link 
            href="/committee"
            className="rounded-lg bg-purple-600 px-6 py-2 text-white transition hover:bg-purple-700"
          >
            Committee Content
          </Link>
          <Link 
            href="/editor"
            className="rounded-lg bg-red-600 px-6 py-2 text-white transition hover:bg-red-700"
          >
            Editor Dashboard
          </Link>
        </div>

        {/* Newsletter Progress */}
        <div className="mb-12 rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-2xl font-bold text-gray-800">
            {month} Newsletter Progress
          </h2>
          <div className="mb-2 h-8 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
              style={{ width: `${completion}%` }}
            />
          </div>
          <p className="text-center text-lg font-semibold text-gray-700">
            {completion}% Complete
          </p>
        </div>

        {/* Submission Categories */}
        <div className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-gray-800">
            Submit Your Content
          </h2>
          
          {/* Community Contributions */}
          <div className="mb-8">
            <h3 className="mb-4 text-xl font-semibold text-blue-800">
              Community Contributions
            </h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {COMMUNITY_CATEGORIES.map(category => (
                <Link
                  key={category}
                  href={`/submit/${encodeURIComponent(category)}`}
                  className="rounded-lg bg-blue-600 p-4 text-center text-white transition hover:bg-blue-700"
                >
                  <div className="font-semibold">{category}</div>
                  <div className="mt-1 text-sm opacity-90">
                    {stats[category] || 0} submissions
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Submission Stats Summary */}
        <div className="mb-12 rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-6 text-2xl font-bold text-gray-800">
            Submission Summary
          </h2>
          
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <h3 className="mb-3 font-semibold text-blue-800">
                Community Contributions
              </h3>
              <ul className="space-y-2 text-sm">
                {COMMUNITY_CATEGORIES.map(cat => (
                  <li key={cat} className="flex justify-between">
                    <span>{cat}:</span>
                    <span className="font-semibold">{stats[cat] || 0}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-3 font-semibold text-green-800">
                Routine Content
              </h3>
              <ul className="space-y-2 text-sm">
                {ROUTINE_CATEGORIES.map(cat => (
                  <li key={cat} className="flex justify-between">
                    <span>{cat}:</span>
                    <span className="font-semibold">{stats[cat] || 0}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-3 font-semibold text-purple-800">
                Committee Content
              </h3>
              <ul className="space-y-2 text-sm">
                {COMMITTEE_CATEGORIES.slice(0, 5).map(cat => (
                  <li key={cat} className="flex justify-between text-xs">
                    <span>{cat}:</span>
                    <span className="font-semibold">{stats[cat] || 0}</span>
                  </li>
                ))}
                {COMMITTEE_CATEGORIES.slice(5).map(cat => (
                  <li key={cat} className="flex justify-between text-xs">
                    <span>{cat}:</span>
                    <span className="font-semibold">{stats[cat] || 0}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Submission Guidelines */}
        <div className="rounded-lg bg-amber-50 p-8 shadow-lg">
          <h2 className="mb-4 text-2xl font-bold text-amber-900">
            Submission Guidelines
          </h2>
          <div className="space-y-3 text-gray-700">
            <p>
              <strong>Deadline:</strong> All content for the {month} issue must be 
              submitted by <strong className="text-amber-900">{deadline}</strong>.
            </p>
            <p>
              By submitting content to The GRIT, you grant the Sandia Heights 
              Homeowners Association the right to publish, edit, and distribute 
              your submission in the newsletter and related communications.
            </p>
            <p>
              All submissions are subject to editorial review and may be edited 
              for length, clarity, and appropriateness. The editors reserve the 
              right to decline any submission.
            </p>
            <p>
              Please keep submissions concise and relevant to the Sandia Heights 
              community. Include your name and contact information with all submissions.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
