'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { COMMUNITY_CATEGORIES, ROUTINE_CATEGORIES, COMMITTEE_CATEGORIES } from '@/lib/types';
import { APP_NAME, APP_SUBTITLE, getMonthName } from '@/lib/constants';

export default function Home() {
  const [currentStats, setCurrentStats] = useState<Record<string, number>>({});
  const [previousStats, setPreviousStats] = useState<Record<string, number>>({});
  const [currentContributors, setCurrentContributors] = useState<string[]>([]);
  const [previousContributors, setPreviousContributors] = useState<string[]>([]);
  const [currentMonthKey, setCurrentMonthKey] = useState('');
  const [previousMonthKey, setPreviousMonthKey] = useState('');
  const [currentRoutineCommitteeCount, setCurrentRoutineCommitteeCount] = useState(0);
  const [previousRoutineCommitteeCount, setPreviousRoutineCommitteeCount] = useState(0);
  const [deadlineInfo, setDeadlineInfo] = useState({ month: '', deadline: '' });

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
        setCurrentRoutineCommitteeCount(data.currentRoutineCommitteeCount || 0);
        setPreviousRoutineCommitteeCount(data.previousRoutineCommitteeCount || 0);
        setDeadlineInfo(data.deadlineInfo || { month: '', deadline: '' });
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
            <h2 className="mb-4 text-center text-3xl font-bold text-orange-900">
              Now Collecting Contributions for the <span className="text-orange-700">{deadlineInfo.month || 'Upcoming'} Issue</span>
            </h2>
            <p className="mb-4 text-center text-xl font-semibold text-red-800">
              Local Events | Photos | Little Things Worth Sharing
            </p>
            <div className="mx-auto max-w-3xl space-y-2 text-center text-gray-900">
              <p className="text-lg">
                <strong className="text-orange-900">We welcome your submissions!</strong> The GRIT is your community newsletter, 
                and we want to hear from you. We welcome any neighborhood-relevant content, 
                from short thoughts to full articles.
              </p>
              <p className="text-sm">
                <strong className="text-orange-900">Deadline:</strong> {deadlineInfo.deadline || 'TBD'} • 
                <a href="#guidelines" className="text-teal-700 hover:text-teal-800 underline ml-1">Content Guidelines</a> • 
                <a href="#terms" className="text-green-700 hover:text-green-800 underline">Terms</a> • 
                <a href="mailto:griteditor@sandiahomeowners.org" className="text-teal-700 hover:text-teal-800 underline">Contact Editor</a>
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
                href="/submit/classifieds"
                className="rounded-lg border-2 border-red-700 bg-transparent p-4 text-center transition hover:bg-red-50 hover:shadow-lg"
              >
                <div className="font-semibold text-red-800">Classifieds</div>
                <div className="mt-1 text-sm text-gray-700">Buy, sell, trade, or offer help.</div>
              </Link>
              <Link
                href="/submit/lost-found"
                className="rounded-lg border-2 border-red-700 bg-transparent p-4 text-center transition hover:bg-red-50 hover:shadow-lg"
              >
                <div className="font-semibold text-red-800">Lost & Found</div>
                <div className="mt-1 text-sm text-gray-700">Report lost items or found property.</div>
              </Link>
              <Link
                href="/submit/on-my-mind"
                className="rounded-lg border-2 border-red-700 bg-transparent p-4 text-center transition hover:bg-red-50 hover:shadow-lg"
              >
                <div className="font-semibold text-red-800">On My Mind</div>
                <div className="mt-1 text-sm text-gray-700">Thoughts, observations, opinions.</div>
              </Link>
              <Link
                href="/submit/response"
                className="rounded-lg border-2 border-red-700 bg-transparent p-4 text-center transition hover:bg-red-50 hover:shadow-lg"
              >
                <div className="font-semibold text-red-800">Response to Prior Content</div>
                <div className="mt-1 text-sm text-gray-700">Comment on past articles.</div>
              </Link>
              <Link
                href="/submit/local-event"
                className="rounded-lg border-2 border-red-700 bg-transparent p-4 text-center transition hover:bg-red-50 hover:shadow-lg"
              >
                <div className="font-semibold text-red-800">Local Event Announcement</div>
                <div className="mt-1 text-sm text-gray-700">Promote gatherings & activities.</div>
              </Link>
              <Link
                href="/submit/kids-corner"
                className="rounded-lg border-2 border-red-700 bg-transparent p-4 text-center transition hover:bg-red-50 hover:shadow-lg"
              >
                <div className="font-semibold text-red-800">Kids' Corner</div>
                <div className="mt-1 text-sm text-gray-700">Jokes, drawings, stories from kids.</div>
              </Link>
              <Link
                href="/submit/diy-crafts"
                className="rounded-lg border-2 border-red-700 bg-transparent p-4 text-center transition hover:bg-red-50 hover:shadow-lg"
              >
                <div className="font-semibold text-red-800">DIY & Crafts</div>
                <div className="mt-1 text-sm text-gray-700">Recipes, crafts, gardening tips.</div>
              </Link>
              <Link
                href="/submit/neighbor-appreciation"
                className="rounded-lg border-2 border-red-700 bg-transparent p-4 text-center transition hover:bg-red-50 hover:shadow-lg"
              >
                <div className="font-semibold text-red-800">Neighbor Appreciation</div>
                <div className="mt-1 text-sm text-gray-700">Recognize & thank neighbors.</div>
              </Link>
              <Link
                href="/submit/nature-wildlife"
                className="rounded-lg border-2 border-red-700 bg-transparent p-4 text-center transition hover:bg-red-50 hover:shadow-lg"
              >
                <div className="font-semibold text-red-800">Nature & Wildlife</div>
                <div className="mt-1 text-sm text-gray-700">Wildlife sightings, nature photos.</div>
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
                <li className="flex justify-between text-gray-800 border-t border-gray-300 pt-2 mt-2">
                  <span>Routine & Committee:</span>
                  <span className="font-semibold text-red-700">{currentRoutineCommitteeCount}</span>
                </li>
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
                <li className="flex justify-between text-gray-600 border-t border-gray-300 pt-2 mt-2">
                  <span>Routine & Committee:</span>
                  <span className="font-semibold text-gray-700">{previousRoutineCommitteeCount}</span>
                </li>
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

        {/* SHHA Committee & Routine Monthly Submissions */}
        <div className="mb-8 rounded-xl bg-gradient-to-br from-amber-50 to-red-50 p-8 shadow-xl border-2 border-amber-400">
          <h2 className="mb-4 text-2xl font-bold text-amber-900 text-center">
            SHHA Committee & Routine Monthly Submissions
          </h2>
          <p className="mb-6 text-center text-gray-700">
            For committee members and regular contributors
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="/routine"
              className="rounded-lg bg-amber-700 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-amber-800 hover:shadow-xl"
            >
              Routine Content
            </Link>
            <Link 
              href="/committee"
              className="rounded-lg bg-amber-700 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-amber-800 hover:shadow-xl"
            >
              Committee Content
            </Link>
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
          </div>
          <p className="mt-4 text-center text-sm text-amber-200">
            Password required • For authorized users only
          </p>
        </div>

       {/* Content Guidelines */}
        <div id="guidelines" className="mt-12 bg-orange-50 p-6 border-2 border-red-600 rounded-xl">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Content Guidelines</h3>
          <div className="space-y-3 text-base text-gray-800">
            <p>
              To help us publish a clear, readable, and useful newsletter each month, please keep the following in mind:
            </p>

            <ul className="ml-6 space-y-2 list-disc">
              <li>Submissions may be very short or up to ~500 words.</li>
              <li>Only plain text submissions are accepted in this portal.</li>
              <li>
                Content should be relevant to life in Sandia Heights or of clear interest to neighbors.
              </li>
              <li>
                Write for a general neighborhood audience. Keep content respectful, constructive,
                and appropriate for all ages.
              </li>
              <li>
                Avoid inflammatory language, personal attacks, or speculation presented as fact.
              </li>
              <li>
                Please avoid business promotion. For advertising, contact{" "}
                <a
                  href="mailto:office@sandiahomeowners.org"
                  className="text-blue-700 hover:text-blue-800 underline"
                >
                  office@sandiahomeowners.org
                </a>.
              </li>
              <li>
                If your piece has sections, use simple headings such as:<br />
                <code className="bg-gray-200 px-1 py-0.5 rounded">HEADING:</code> on its own line,
                or{" "}
                <code className="bg-gray-200 px-1 py-0.5 rounded">### Heading</code>.
              </li>
              <li>If you reference links, include the full URL.</li>
            </ul>

            <h4 className="mt-4 font-semibold text-gray-900">Photos</h4>
            <p>If you would like photos included:</p>
            <ul className="ml-6 space-y-2 list-disc">
              <li>
                Place a clear placeholder in your text where the photo should appear, for example:<br />
                <code className="bg-gray-200 px-1 py-0.5 rounded">
                  [PHOTO: roadrunner on wall]
                </code>{" "}
                or{" "}
                <code className="bg-gray-200 px-1 py-0.5 rounded">
                  [PHOTO 1: caption here]
                </code>
              </li>
              <li>
                Then email the photo(s) to{" "}
                <a
                  href="mailto:griteditor@sandiahomeowners.org"
                  className="text-blue-700 hover:text-blue-800 underline"
                >
                  griteditor@sandiahomeowners.org
                </a>.
              </li>
            </ul>

            <h4 className="mt-4 font-semibold text-gray-900">Editing & Placement</h4>
            <p>
              Editors may shorten or edit submissions for clarity and fit. Not all content
              will appear in the same issue it is submitted; some items may be saved for a future
              month.
            </p>

            <h4 className="mt-4 font-semibold text-gray-900">Not Sure Where It Fits?</h4>
            <p>
              If you're unsure which category to choose, select <strong>On My Mind</strong>.
            </p>
          </div>
        </div>

        {/* Submission Terms - Plain text at bottom */}
        <div id="terms" className="mt-8 bg-orange-50 p-6 border-2 border-red-300 rounded-xl">
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
