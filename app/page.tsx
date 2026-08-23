'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import HomeSubmissionForm from '@/app/components/HomeSubmissionForm';
import { COMMUNITY_CATEGORIES } from '@/lib/types';
import { getMonthName } from '@/lib/constants';
import { DEFAULT_HOMEPAGE_CONTENT, type HomepageContent } from '@/lib/homepage-content';

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const linkPattern = /(\*\*([^*]+)\*\*)|\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      nodes.push(<strong key={`${match.index}-strong`}>{match[2]}</strong>);
    } else if (match[3] && match[4]) {
      nodes.push(
        <a key={`${match.index}-link`} href={match[4]} className="text-teal-700 underline hover:text-teal-900">
          {match[3]}
        </a>
      );
    }

    lastIndex = linkPattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function MarkdownBlock({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n');
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(' ');
    blocks.push(<p key={`p-${blocks.length}`}>{renderInlineMarkdown(text)}</p>);
    paragraph = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="ml-6 list-disc space-y-2">
        {listItems.map((item, index) => (
          <li key={index}>{renderInlineMarkdown(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }
    if (trimmed.startsWith('### ')) {
      flushParagraph();
      flushList();
      blocks.push(<h4 key={`h-${blocks.length}`} className="mt-4 font-semibold text-gray-900">{renderInlineMarkdown(trimmed.slice(4))}</h4>);
      return;
    }
    if (trimmed.startsWith('- ')) {
      flushParagraph();
      listItems.push(trimmed.slice(2));
      return;
    }
    flushList();
    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();

  return <div className="space-y-3">{blocks}</div>;
}

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
  const [homepageContent, setHomepageContent] = useState<HomepageContent>(DEFAULT_HOMEPAGE_CONTENT);
  const currentCommunityTotal = COMMUNITY_CATEGORIES.reduce((total, category) => total + (currentStats[category] || 0), 0);
  const previousCommunityTotal = COMMUNITY_CATEGORIES.reduce((total, category) => total + (previousStats[category] || 0), 0);
  const currentContributionTotal = currentCommunityTotal + currentRoutineCommitteeCount;
  const previousContributionTotal = previousCommunityTotal + previousRoutineCommitteeCount;
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

  useEffect(() => {
    fetch('/api/homepage-content')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setHomepageContent(data);
      })
      .catch(err => console.error('Failed to load homepage content:', err));
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
        <section className="mb-8 border-y border-orange-300/80 py-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-800">
            Now collecting for {deadlineInfo.month || 'the upcoming issue'}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-orange-950 md:text-4xl">
            We welcome your submissions!
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-gray-800">
            {homepageContent.welcomeText}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold">
            <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-950">
              Deadline: {deadlineInfo.deadline || 'TBD'}
            </span>
            <a href="#guidelines" className="rounded-full bg-white px-3 py-1 text-teal-800 underline decoration-teal-300 underline-offset-4 hover:text-teal-950">
              Guidelines
            </a>
            <a href="#terms" className="rounded-full bg-white px-3 py-1 text-teal-800 underline decoration-teal-300 underline-offset-4 hover:text-teal-950">
              Terms
            </a>
            <a href="mailto:griteditor@sandiahomeowners.org" className="rounded-full bg-white px-3 py-1 text-teal-800 underline decoration-teal-300 underline-offset-4 hover:text-teal-950">
              Contact editor
            </a>
          </div>
        </section>

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

        <section className="mb-12 border-y-2 border-teal-700/70 bg-teal-50/80 px-5 py-7 md:px-8 md:py-8">
          <div className="mb-6 flex flex-col gap-2 text-center md:flex-row md:items-end md:justify-between md:text-left">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Neighborhood scoreboard</p>
              <h2 className="text-2xl font-bold text-orange-950">
                What&apos;s rolling in
              </h2>
            </div>
            <p className="text-sm font-medium text-gray-600">
              A friendly tally of this month&apos;s GRIT contributions.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            {/* Current Month */}
            <div className="border-l-4 border-orange-600 pl-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-orange-950">
                  {currentMonthKey ? getMonthName(currentMonthKey) : 'This Month'}
                </h3>
                <span className="text-xs font-bold uppercase tracking-wide text-orange-800">
                  In play
                </span>
              </div>
              <div className="grid grid-cols-2 divide-x divide-orange-200 border-y border-orange-200 py-2 text-center">
                <div className="p-3">
                  <div className="text-3xl font-bold text-orange-800">{currentContributionTotal}</div>
                  <div className="text-xs font-semibold text-gray-600">Contributions</div>
                </div>
                <div className="p-3">
                  <div className="text-3xl font-bold text-amber-700">{captionContestEnabled ? captionCount : '–'}</div>
                  <div className="text-xs font-semibold text-gray-600">Captions</div>
                </div>
              </div>
              
              {/* Current Contributors List */}
              <div className="mt-5 border-t border-orange-200 pt-4">
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-orange-900">
                  Contributors
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
            <div className="border-l-4 border-slate-500 pl-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">
                  {previousMonthKey ? getMonthName(previousMonthKey) : 'Last Month'}
                </h3>
                <span className="text-xs font-bold uppercase tracking-wide text-gray-600">
                  Last round
                </span>
              </div>
              <div className="border-y border-gray-300 py-2 text-center">
                <div className="p-3">
                  <div className="text-3xl font-bold text-gray-800">{previousContributionTotal}</div>
                  <div className="text-xs font-semibold text-gray-600">Contributions</div>
                </div>
              </div>
              
              {/* Previous Contributors List */}
              <div className="mt-5 border-t border-gray-300 pt-4">
                <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
                  Contributors
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
        </section>

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
          <div className="mt-4 text-base text-gray-800">
            <MarkdownBlock markdown={homepageContent.guidelinesMarkdown} />
          </div>
        </details>

        {/* Submission Terms */}
        <details id="terms" className="mt-4 rounded-lg border border-orange-200 bg-white/80 p-5 shadow">
          <summary className="cursor-pointer text-lg font-semibold text-gray-900">
            Submission Terms & Conditions
          </summary>
          <div className="mt-4 text-sm text-gray-800">
            <MarkdownBlock markdown={homepageContent.termsMarkdown} />
          </div>
        </details>
      </main>
    </div>
  );
}
