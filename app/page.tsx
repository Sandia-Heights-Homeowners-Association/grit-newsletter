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

        {/* Call to Action - Community Contributions */}
        <div className="mb-12">
          <div className="mb-8">
            <h2 className="mb-4 text-3xl font-bold text-orange-900">
              Now Collecting Contributions for the {month} Issue
            </h2>
            <div className="space-y-4 text-gray-900">
              <p className="text-lg">
                <strong className="text-orange-900">We welcome your submissions!</strong> The GRIT is your community newsletter, 
                and we want to hear from you. Share your stories, announcements, photos, ideas, and more.
              </p>
              <p>
                Whether you've spotted interesting wildlife, have a recipe to share, want to announce an event, 
                or simply have something on your mind about our community—we'd love to include it in the newsletter.
              </p>
              <p>
                <strong className="text-orange-900">Deadline:</strong> All content for the {month} issue must be 
                submitted by <strong className="text-red-700">{deadline}</strong>. Click any category below to submit your contribution.
              </p>
              <p className="text-sm">
                By submitting, you agree to our <a href="#terms" className="text-green-700 hover:text-green-800 underline font-medium">submission terms</a>.
              </p>
            </div>
          </div>
          
          {/* Community Contributions */}
          <div>
            <h3 className="mb-4 text-xl font-semibold text-red-800">
              Choose a Category
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/submit/Classifieds"
                className="rounded-lg border-2 border-red-700 bg-transparent p-4 text-center transition hover:bg-red-50 hover:shadow-lg"
              >
                <div className="font-semibold text-red-800">Classifieds</div>
                <div className="mt-1 text-sm text-gray-700">Buy, sell, trade, or offer help.</div>
              </Link>
              <Link
                href="/submit/Lost & Found"
                className="rounded-lg border-2 border-red-700 bg-transparent p-4 text-center transition hover:bg-red-50 hover:shadow-lg"
              >
                <div className="font-semibold text-red-800">Lost & Found</div>
                <div className="mt-1 text-sm text-gray-700">Report lost items or found property.</div>
              </Link>
              <Link
                href="/submit/On My Mind"
                className="rounded-lg border-2 border-red-700 bg-transparent p-4 text-center transition hover:bg-red-50 hover:shadow-lg"
              >
                <div className="font-semibold text-red-800">On My Mind</div>
                <div className="mt-1 text-sm text-gray-700">Share thoughts, ideas, or opinions.</div>
              </Link>
              <Link
                href="/submit/Response to Prior Content"
                className="rounded-lg border-2 border-red-700 bg-transparent p-4 text-center transition hover:bg-red-50 hover:shadow-lg"
              >
                <div className="font-semibold text-red-800">Response to Prior Content</div>
                <div className="mt-1 text-sm text-gray-700">React to articles from past issues.</div>
              </Link>
              <Link
                href="/submit/Local Event Announcement"
                className="rounded-lg border-2 border-red-700 bg-transparent p-4 text-center transition hover:bg-red-50 hover:shadow-lg"
              >
                <div className="font-semibold text-red-800">Local Event Announcement</div>
                <div className="mt-1 text-sm text-gray-700">Promote neighborhood events and meetups.</div>
              </Link>
              <Link
                href="/submit/Kids' Corner"
                className="rounded-lg border-2 border-red-700 bg-transparent p-4 text-center transition hover:bg-red-50 hover:shadow-lg"
              >
                <div className="font-semibold text-red-800">Kids' Corner</div>
                <div className="mt-1 text-sm text-gray-700">Jokes, art, stories, or kid creations.</div>
              </Link>
              <Link
                href="/submit/DIY & Crafts"
                className="rounded-lg border-2 border-red-700 bg-transparent p-4 text-center transition hover:bg-red-50 hover:shadow-lg"
              >
                <div className="font-semibold text-red-800">DIY & Crafts</div>
                <div className="mt-1 text-sm text-gray-700">Simple projects, recipes, or creative tips.</div>
              </Link>
              <Link
                href="/submit/Neighbor Appreciation"
                className="rounded-lg border-2 border-red-700 bg-transparent p-4 text-center transition hover:bg-red-50 hover:shadow-lg"
              >
                <div className="font-semibold text-red-800">Neighbor Appreciation</div>
                <div className="mt-1 text-sm text-gray-700">Thank, celebrate, or recognize a neighbor.</div>
              </Link>
              <Link
                href="/submit/Nature & Wildlife"
                className="rounded-lg border-2 border-red-700 bg-transparent p-4 text-center transition hover:bg-red-50 hover:shadow-lg"
              >
                <div className="font-semibold text-red-800">Nature & Wildlife</div>
                <div className="mt-1 text-sm text-gray-700">Animals, scenery, unusual sightings.</div>
              </Link>
            </div>
          </div>
        </div>
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

        {/* Navigation to protected pages */}
        <div className="rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 p-8 shadow-xl">
          <h2 className="mb-4 text-2xl font-bold text-amber-100 text-center">
            Editor Access
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="/editor"
              className="rounded-lg bg-teal-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-teal-700 hover:shadow-xl"
            >
              Editor Dashboard
            </Link>
          </div>
          <p className="mt-4 text-center text-sm text-amber-200">
            Password required • For authorized users only
          </p>
        </div>

        {/* Submission Terms - Plain text at bottom */}
        <div id="terms" className="mt-12 rounded-lg bg-gray-50 p-6 border border-gray-300">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Submission Terms & Conditions</h3>
          <div className="space-y-2 text-sm text-gray-800">
            <p>
              By submitting content to The GRIT, you grant the Sandia Heights Homeowners Association 
              the right to publish, edit, and distribute your submission in the newsletter and related communications.
            </p>
            <p>
              All submissions are subject to editorial review and may be edited for length, clarity, and appropriateness. 
              The editors reserve the right to decline any submission.
            </p>
            <p>
              Please keep submissions concise and relevant to the Sandia Heights community. 
              Include your name and contact information with all submissions.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
