'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { COMMUNITY_CATEGORIES, ROUTINE_CATEGORIES, COMMITTEE_CATEGORIES } from '@/lib/types';
import { APP_NAME, APP_SUBTITLE, getNextPublicationInfo, getMonthName } from '@/lib/constants';

export default function Home() {
  const [currentStats, setCurrentStats] = useState<Record<string, number>>({});
  const [previousStats, setPreviousStats] = useState<Record<string, number>>({});
  const [currentContributors, setCurrentContributors] = useState<string[]>([]);
  const [previousContributors, setPreviousContributors] = useState<string[]>([]);
  const [currentMonthKey, setCurrentMonthKey] = useState('');
  const [previousMonthKey, setPreviousMonthKey] = useState('');
  const { month, deadline } = getNextPublicationInfo();

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setCurrentStats(data.currentStats || {});
        setPreviousStats(data.previousStats || {});
        setCurrentContributors(data.currentContributors || []);
        setPreviousContributors(data.previousContributors || []);
        setCurrentMonthKey(data.currentMonth || '');
        setPreviousMonthKey(data.previousMonth || '');
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
          
          {/* Links to GRIT Archives */}
          <div className="mt-4 flex justify-center gap-6">
            <a 
              href="https://sandiahomeowners.org/grit-newsletter/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-teal-700 hover:text-teal-800 underline font-medium"
            >
              Past GRIT Issues
            </a>
            <a 
              href="https://sandiahomeowners.org/grit-index" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-teal-700 hover:text-teal-800 underline font-medium"
            >
              GRIT Article Index
            </a>
          </div>
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
        <div className="mb-12 rounded-xl bg-white p-8 shadow-xl border-2 border-red-100">
          <h2 className="mb-6 text-2xl font-bold text-red-900 text-center">
            Community Contributions
          </h2>
          <div className="grid gap-8 md:grid-cols-2">
            {/* Current Month */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-red-800 text-center">
                {currentMonthKey ? getMonthName(currentMonthKey) : 'This Month'}
              </h3>
              <ul className="space-y-2 text-sm">
                {COMMUNITY_CATEGORIES.map(cat => (
                  <li key={cat} className="flex justify-between text-gray-800">
                    <span>{cat}:</span>
                    <span className="font-semibold text-red-700">{currentStats[cat] || 0}</span>
                  </li>
                ))}
              </ul>
              
              {/* Current Contributors List */}
              <div className="mt-6 border-t-2 border-red-200 pt-6">
                <h4 className="mb-3 text-base font-semibold text-red-900 text-center">
                  Contributors
                </h4>
                {currentContributors.length > 0 ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    {currentContributors.map((name, idx) => (
                      <span 
                        key={idx}
                        className="rounded-full bg-gradient-to-r from-red-100 to-amber-100 px-3 py-1 text-sm font-medium text-red-900 border border-red-300"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-gray-600 italic">
                    No submissions for this month yet
                  </p>
                )}
              </div>
            </div>

            {/* Previous Month */}
            <div>
              <h3 className="mb-4 text-lg font-semibold text-gray-700 text-center">
                {previousMonthKey ? getMonthName(previousMonthKey) : 'Last Month'}
              </h3>
              <ul className="space-y-2 text-sm">
                {COMMUNITY_CATEGORIES.map(cat => (
                  <li key={cat} className="flex justify-between text-gray-600">
                    <span>{cat}:</span>
                    <span className="font-semibold text-gray-700">{previousStats[cat] || 0}</span>
                  </li>
                ))}
              </ul>
              
              {/* Previous Contributors List */}
              <div className="mt-6 border-t-2 border-gray-300 pt-6">
                <h4 className="mb-3 text-base font-semibold text-gray-700 text-center">
                  Contributors
                </h4>
                {previousContributors.length > 0 ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    {previousContributors.map((name, idx) => (
                      <span 
                        key={idx}
                        className="rounded-full bg-gradient-to-r from-gray-100 to-gray-200 px-3 py-1 text-sm font-medium text-gray-700 border border-gray-300"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-sm text-gray-500 italic">
                    No submissions
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation to protected pages */}
        <div className="rounded-xl bg-gradient-to-br from-amber-900 to-red-900 p-8 shadow-xl">
          <h2 className="mb-4 text-2xl font-bold text-amber-100 text-center">
            Editor Access
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="/editor"
              className="rounded-lg bg-orange-800 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-orange-900 hover:shadow-xl"
            >
              Editor Dashboard
            </Link>
            <Link 
              href="/routine"
              className="rounded-lg bg-orange-800 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-orange-900 hover:shadow-xl"
            >
              Routine Content
            </Link>
            <Link 
              href="/committee"
              className="rounded-lg bg-orange-800 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-orange-900 hover:shadow-xl"
            >
              Committee Content
            </Link>
          </div>
          <p className="mt-4 text-center text-sm text-amber-200">
            Password required • For authorized users only
          </p>
        </div>

        {/* Submission Terms - Plain text at bottom */}
        <div id="terms" className="mt-12 rounded-lg bg-gray-50 p-6 border border-gray-300">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Submission Terms & Conditions</h3>
          <div className="space-y-3 text-sm text-gray-800">
            <p>
              Thank you for contributing to The GRIT! By sending us your content, you give the Sandia Heights Homeowners Association (SHHA) a non-exclusive, royalty-free right to publish, edit, reproduce, and distribute your submission in the newsletter, on the SHHA website, in email communications, and in other Association materials. This includes permission for us to make any needed editorial changes, format your content for publication, and archive it for future reference.
            </p>
            <p>
              All submissions go through an editorial review process. Our editors may adjust content for length, clarity, tone, or appropriateness, and we reserve the right to decline any submission. While we appreciate every contribution, we cannot guarantee publication or accommodate requests for specific placement, timing, or prominence.
            </p>
            <p>
              Please help us keep the newsletter enjoyable and useful by making sure your submission is concise, respectful, and relevant to the Sandia Heights community. Submissions must be your own original work. By contributing, you confirm that you hold the rights to the text, images, or other materials you provide and that your content does not infringe on the rights of others. If your submission includes photos of people who can be identified, please make sure you have their permission.
            </p>
            <p>
              Be sure to include your name and contact information with each submission. We will not publish your contact details without your permission, but we may reach out if clarification is needed. Anonymous or unverifiable submissions may not be accepted.
            </p>
            <p>
              Please note that SHHA is not responsible for any errors, omissions, or misinterpretations in submitted content, and publication does not imply endorsement of the opinions expressed.
            </p>
            <p>
              SHHA may update or revise these Terms & Conditions at any time.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
