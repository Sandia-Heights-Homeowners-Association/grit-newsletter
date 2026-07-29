'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import HomeSubmissionForm from '@/app/components/HomeSubmissionForm';
import { COMMUNITY_CATEGORIES } from '@/lib/types';
import { getMonthName } from '@/lib/constants';

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
  const [captionCount, setCaptionCount] = useState(0);
  const [captionContributors, setCaptionContributors] = useState<string[]>([]);
  const [captionContestEnabled, setCaptionContestEnabled] = useState(false);
  const [captionContestTitle, setCaptionContestTitle] = useState('Caption Contest');
  const currentCommunityTotal = COMMUNITY_CATEGORIES.reduce((total, category) => total + (currentStats[category] || 0), 0);
  const previousCommunityTotal = COMMUNITY_CATEGORIES.reduce((total, category) => total + (previousStats[category] || 0), 0);
  const currentAllContributors = captionContestEnabled && captionContributors.length > 0
    ? [...new Set([...currentContributors, ...captionContributors])].sort()
    : currentContributors;

  useEffect(() => {
    fetch('/api/caption')
      .then(res => res.json())
      .then(data => {
        setCaptionContestEnabled(data.enabled || false);
        setCaptionContestTitle(data.title || 'Caption Contest');
      })
      .catch(() => {});
  }, []);

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
        setCaptionCount(data.captionCount || 0);
        setCaptionContributors(data.captionContributors || []);
      })
      .catch(err => console.error('Failed to load stats:', err));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-orange-100 to-amber-100">
      <main className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          {/* Logo */}
          <div className="mb-5 flex justify-center">
            <Image 
              src="/logo.png" 
              alt="The GRIT Logo" 
              width={480} 
              height={120}
              className="object-contain"
            />
          </div>
          
          <p className="text-base font-medium text-orange-800">
            Sandia Heights Homeowners Association Newsletter
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
        <div className="mb-6 rounded-lg border border-orange-300 bg-white/80 px-5 py-5 text-center shadow-lg backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-800">
            Now collecting for {deadlineInfo.month || 'the upcoming issue'}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-orange-950 md:text-4xl">
            We welcome your submissions!
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-gray-800">
            The GRIT is your community newsletter. Send a quick note, a photo idea, a local event, or a full article.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold">
            <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-950">
              Deadline: {deadlineInfo.deadline || 'TBD'}
            </span>
            <a href="#guidelines" className="rounded-full bg-white px-3 py-1 text-teal-800 underline decoration-teal-300 underline-offset-4 hover:text-teal-950">
              Guidelines
            </a>
            <a href="mailto:griteditor@sandiahomeowners.org" className="rounded-full bg-white px-3 py-1 text-teal-800 underline decoration-teal-300 underline-offset-4 hover:text-teal-950">
              Contact editor
            </a>
          </div>
        </div>

        {/* Caption Contest Banner */}
        {captionContestEnabled && (
          <div className="mb-8">
            <Link
              href="/caption"
              className="flex flex-col gap-4 rounded-lg border-2 border-yellow-500 bg-gradient-to-r from-yellow-100 via-amber-50 to-white px-5 py-4 shadow-xl shadow-yellow-900/10 transition hover:border-yellow-600 hover:shadow-2xl sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏆</span>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-amber-800">Active caption contest</div>
                  <div className="text-lg font-bold text-amber-950">{captionContestTitle}</div>
                </div>
              </div>
              <span className="self-start rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white shadow sm:self-auto">
                Enter Now →
              </span>
            </Link>
          </div>
        )}

        <HomeSubmissionForm />

        <div className="mb-12 rounded-lg border-2 border-teal-200 bg-white p-5 shadow-xl md:p-6">
          <div className="mb-5 flex flex-col gap-2 text-center md:flex-row md:items-end md:justify-between md:text-left">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Neighborhood scoreboard</p>
              <h2 className="text-2xl font-bold text-orange-950">
                What&apos;s rolling in
              </h2>
            </div>
            <p className="text-sm font-medium text-gray-600">
              Every name here helps the issue feel more like Sandia Heights.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {/* Current Month */}
            <div className="rounded-lg border border-orange-300 bg-gradient-to-br from-orange-50 to-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-orange-950">
                  {currentMonthKey ? getMonthName(currentMonthKey) : 'This Month'}
                </h3>
                <span className="rounded-full bg-orange-700 px-3 py-1 text-xs font-bold text-white">
                  In play
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-white p-3 shadow-sm">
                  <div className="text-2xl font-bold text-orange-800">{currentCommunityTotal}</div>
                  <div className="text-xs font-semibold text-gray-600">Community</div>
                </div>
                <div className="rounded-md bg-white p-3 shadow-sm">
                  <div className="text-2xl font-bold text-teal-800">{currentRoutineCommitteeCount}</div>
                  <div className="text-xs font-semibold text-gray-600">Routine</div>
                </div>
                <div className="rounded-md bg-white p-3 shadow-sm">
                  <div className="text-2xl font-bold text-amber-700">{captionContestEnabled ? captionCount : '–'}</div>
                  <div className="text-xs font-semibold text-gray-600">Captions</div>
                </div>
              </div>
              
              {/* Current Contributors List */}
              <div className="mt-5 border-t border-orange-200 pt-4">
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-orange-900">
                  Roll call
                </h4>
                {currentAllContributors.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {currentAllContributors.map((name, idx) => (
                      <span
                        key={idx}
                        className="rounded-full border border-orange-200 bg-white px-3 py-1 text-sm font-semibold text-orange-950"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 italic">
                    No submissions for this month yet
                  </p>
                )}
              </div>
            </div>

            {/* Previous Month */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">
                  {previousMonthKey ? getMonthName(previousMonthKey) : 'Last Month'}
                </h3>
                <span className="rounded-full bg-gray-700 px-3 py-1 text-xs font-bold text-white">
                  Last round
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-md bg-white p-3 shadow-sm">
                  <div className="text-2xl font-bold text-gray-800">{previousCommunityTotal}</div>
                  <div className="text-xs font-semibold text-gray-600">Community</div>
                </div>
                <div className="rounded-md bg-white p-3 shadow-sm">
                  <div className="text-2xl font-bold text-gray-800">{previousRoutineCommitteeCount}</div>
                  <div className="text-xs font-semibold text-gray-600">Routine</div>
                </div>
              </div>
              
              {/* Previous Contributors List */}
              <div className="mt-5 border-t border-gray-300 pt-4">
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
                  Roll call
                </h4>
                {previousContributors.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {previousContributors.map((name, idx) => (
                      <span 
                        key={idx}
                        className="rounded-full bg-white px-3 py-1 text-sm font-medium text-gray-700 border border-gray-300"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                    <p className="text-sm text-gray-500 italic">
                      No submissions
                    </p>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Routine Monthly Submissions */}
        <div className="mb-8 rounded-lg bg-gradient-to-br from-amber-50 to-red-50 p-6 shadow-lg border border-amber-300">
          <h2 className="mb-4 text-2xl font-bold text-amber-900 text-center">
            Routine Monthly Submissions
          </h2>
          <p className="mb-6 text-center text-gray-700">
            For highly regular items such as ACC, CSC, and Security logs. Committee articles can use the main form above.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link 
              href="/routine"
              className="rounded-lg bg-amber-700 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-amber-800 hover:shadow-xl"
            >
              Routine Content
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
        <details id="guidelines" className="mt-12 rounded-lg border-2 border-orange-300 bg-white/85 p-5 shadow">
          <summary className="cursor-pointer text-lg font-semibold text-gray-900">
            Content Guidelines
          </summary>
          <div className="space-y-3 text-base text-gray-800">
            <p>
              To help us publish a clear, readable, and useful newsletter each month, please keep the following in mind:
            </p>

            <ul className="ml-6 space-y-2 list-disc">
              <li>Submissions may be very short or up to ~500 words.</li>
              <li>You can type, paste from Word, or import a Word document into the form.</li>
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
                Please avoid excessive business promotion. For advertising, contact{" "}
                <a
                  href="mailto:office@sandiahomeowners.org"
                  className="text-blue-700 hover:text-blue-800 underline"
                >
                  office@sandiahomeowners.org
                </a>.
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
              If you&apos;re unsure which topic to choose, leave the form set to <strong>General Submission / Other</strong>.
            </p>
          </div>
        </details>

        {/* Submission Terms - Plain text at bottom */}
        <details id="terms" className="mt-4 rounded-lg border border-orange-200 bg-white/80 p-5 shadow">
          <summary className="cursor-pointer text-lg font-semibold text-gray-900">
            Submission Terms & Conditions
          </summary>
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
        </details>
      </main>
    </div>
  );
}
