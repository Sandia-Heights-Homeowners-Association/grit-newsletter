'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { COMMUNITY_CATEGORIES, ROUTINE_CATEGORIES, COMMITTEE_CATEGORIES } from '@/lib/types';
import { APP_NAME, APP_SUBTITLE, getNextPublicationInfo } from '@/lib/constants';

export default function Home() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [completion, setCompletion] = useState(0);
  const [contributors, setContributors] = useState<string[]>([]);
  const { month, deadline } = getNextPublicationInfo();

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data.stats || {});
        setCompletion(data.completion || 0);
        setContributors(data.contributors || []);
      })
      .catch(err => console.error('Failed to load stats:', err));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <main className="mx-auto max-w-6xl px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <Image 
              src="/logo.png" 
              alt="The GRIT Logo" 
              width={480} 
              height={120}
              className="object-contain"
            />
          </div>
          
          <p className="mb-2 text-2xl font-medium text-red-800">{APP_NAME}: {APP_SUBTITLE}</p>
          <p className="text-lg font-medium text-orange-800">
            Sandia Heights Homeowners Association Newsletter
          </p>
          <p className="mt-2 text-base italic text-orange-700">
            Serving our community since the 1970s
          </p>
        </div>

        {/* Submission Guidelines */}
        <div className="mb-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 p-8 shadow-xl border-2 border-orange-300">
          <h2 className="mb-4 text-2xl font-bold text-orange-900">
            Submit content for the SHHA GRIT Newsletter!
          </h2>
          <div className="space-y-3 text-gray-900">
            <p>
              <strong className="text-orange-900">The deadline is the 10th of the month:</strong> All content for the {month} issue must be 
              submitted by <strong className="text-red-700">{deadline}</strong>.
            </p>
            <p>
              By submitting content to The GRIT, you grant the Sandia Heights 
              Homeowners Association the right to publish, edit, and distribute 
              your submission in the newsletter and related communications.
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

        {/* Submission Categories */}
        <div className="mb-12">
          <h2 className="mb-6 text-3xl font-bold text-orange-900">
            Submit Your Content
          </h2>
          
          {/* Community Contributions */}
          <div className="mb-8">
            <h3 className="mb-4 text-xl font-semibold text-red-800">
              Community Contributions
            </h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {COMMUNITY_CATEGORIES.map(category => (
                <Link
                  key={category}
                  href={`/submit/${encodeURIComponent(category)}`}
                  className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 p-4 text-center text-white shadow-lg transition hover:from-orange-600 hover:to-orange-700 hover:shadow-xl transform hover:-translate-y-1"
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
        <div className="mb-12 rounded-xl bg-white p-8 shadow-xl border-2 border-orange-200">
          <h2 className="mb-6 text-2xl font-bold text-orange-900">
            Submission Summary
          </h2>
          
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <h3 className="mb-3 font-semibold text-orange-800 text-lg border-b-2 border-orange-300 pb-2">
                Community Contributions
              </h3>
              <ul className="space-y-2 text-sm">
                {COMMUNITY_CATEGORIES.map(cat => (
                  <li key={cat} className="flex justify-between text-gray-800">
                    <span>{cat}:</span>
                    <span className="font-semibold text-orange-700">{stats[cat] || 0}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-3 font-semibold text-red-800 text-lg border-b-2 border-red-300 pb-2">
                Routine Content
              </h3>
              <ul className="space-y-2 text-sm">
                {ROUTINE_CATEGORIES.map(cat => (
                  <li key={cat} className="flex justify-between text-gray-800">
                    <span>{cat}:</span>
                    <span className="font-semibold text-red-700">{stats[cat] || 0}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-3 font-semibold text-amber-800 text-lg border-b-2 border-amber-300 pb-2">
                Committee Content
              </h3>
              <ul className="space-y-2 text-sm">
                {COMMITTEE_CATEGORIES.slice(0, 5).map(cat => (
                  <li key={cat} className="flex justify-between text-xs text-gray-800">
                    <span className="truncate pr-2">{cat}:</span>
                    <span className="font-semibold text-amber-700 whitespace-nowrap">{stats[cat] || 0}</span>
                  </li>
                ))}
                {COMMITTEE_CATEGORIES.slice(5).map(cat => (
                  <li key={cat} className="flex justify-between text-xs text-gray-800">
                    <span className="truncate pr-2">{cat}:</span>
                    <span className="font-semibold text-amber-700 whitespace-nowrap">{stats[cat] || 0}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Newsletter Progress */}
        <div className="mb-12 rounded-xl bg-white p-8 shadow-xl border-2 border-orange-200">
          <h2 className="mb-4 text-2xl font-bold text-orange-900">
            {month} Newsletter Progress
          </h2>
          <div className="mb-2 h-8 w-full overflow-hidden rounded-full bg-orange-100 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 transition-all duration-500 shadow-lg"
              style={{ width: `${completion}%` }}
            />
          </div>
          <p className="text-center text-lg font-semibold text-orange-800">
            {completion}% Complete
          </p>

          {/* Contributors List */}
          {contributors.length > 0 && (
            <div className="mt-6 border-t-2 border-orange-200 pt-6">
              <h3 className="mb-3 text-lg font-semibold text-orange-900">
                Contributors This Month
              </h3>
              <div className="flex flex-wrap gap-2">
                {contributors.map((name, idx) => (
                  <span 
                    key={idx}
                    className="rounded-full bg-gradient-to-r from-orange-100 to-amber-100 px-3 py-1 text-sm font-medium text-orange-900 border border-orange-300"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation to protected pages - Moved to Bottom */}
        <div className="rounded-xl bg-gradient-to-br from-orange-900 to-red-900 p-8 shadow-xl">
          <h2 className="mb-4 text-2xl font-bold text-amber-100 text-center">
            Staff & Committee Access
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="/routine"
              className="rounded-lg bg-amber-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-amber-700 hover:shadow-xl"
            >
              Routine Content
            </Link>
            <Link 
              href="/committee"
              className="rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-orange-700 hover:shadow-xl"
            >
              Committee Content
            </Link>
            <Link 
              href="/editor"
              className="rounded-lg bg-red-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-red-700 hover:shadow-xl"
            >
              Editor Dashboard
            </Link>
          </div>
          <p className="mt-4 text-center text-sm text-amber-200">
            Password required • For authorized users only
          </p>
        </div>
      </main>
    </div>
  );
}
