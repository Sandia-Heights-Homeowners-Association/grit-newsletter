'use client';

import { type ChangeEvent, useMemo, useState } from 'react';
import Captcha from '@/app/components/Captcha';
import MarkdownEditor from '@/app/components/MarkdownEditor';
import { COMMUNITY_CATEGORIES, COMMITTEE_CATEGORIES, type CommunityCategory, type CommitteeCategory, type SubmissionCategory } from '@/lib/types';

const DEFAULT_COMMUNITY_CATEGORY: CommunityCategory = 'General Submission / Other';
const DEFAULT_COMMITTEE_CATEGORY: CommitteeCategory = 'General Announcements';

interface MammothBrowserModule {
  convertToHtml: (input: { arrayBuffer: ArrayBuffer }) => Promise<{
    value: string;
    messages: Array<{ type: string; message: string }>;
  }>;
  default?: MammothBrowserModule;
}

function getWordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function htmlToMarkdown(html: string): string {
  const document = new DOMParser().parseFromString(html, 'text/html');

  const renderInline = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (!(node instanceof HTMLElement)) {
      return Array.from(node.childNodes).map(renderInline).join('');
    }

    const content = Array.from(node.childNodes).map(renderInline).join('');

    switch (node.tagName.toLowerCase()) {
      case 'strong':
      case 'b':
        return content.trim() ? `**${content}**` : content;
      case 'em':
      case 'i':
        return content.trim() ? `_${content}_` : content;
      case 'a': {
        const href = node.getAttribute('href');
        return href && content.trim() ? `[${content}](${href})` : content;
      }
      case 'br':
        return '\n';
      default:
        return content;
    }
  };

  const renderBlock = (node: Node, orderedIndex?: number): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent?.trim() || '';
    }

    if (!(node instanceof HTMLElement)) {
      return Array.from(node.childNodes).map(child => renderBlock(child)).filter(Boolean).join('\n\n');
    }

    const tag = node.tagName.toLowerCase();

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const level = Number(tag.slice(1));
      return `${'#'.repeat(level)} ${renderInline(node).trim()}`;
    }

    if (tag === 'ul') {
      return Array.from(node.children)
        .filter(child => child.tagName.toLowerCase() === 'li')
        .map(child => renderBlock(child))
        .join('\n');
    }

    if (tag === 'ol') {
      return Array.from(node.children)
        .filter(child => child.tagName.toLowerCase() === 'li')
        .map((child, index) => renderBlock(child, index + 1))
        .join('\n');
    }

    if (tag === 'li') {
      const marker = orderedIndex ? `${orderedIndex}.` : '-';
      return `${marker} ${renderInline(node).trim()}`;
    }

    if (tag === 'p') {
      return renderInline(node).trim();
    }

    if (tag === 'hr') {
      return '---';
    }

    return Array.from(node.childNodes).map(child => renderBlock(child)).filter(Boolean).join('\n\n');
  };

  return Array.from(document.body.childNodes)
    .map(node => renderBlock(node))
    .filter(Boolean)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function createConfetti() {
  const colors = ['#f97316', '#0f766e', '#dc2626', '#f59e0b', '#22c55e'];
  const confettiCount = 90;

  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.style.position = 'fixed';
    confetti.style.width = '9px';
    confetti.style.height = '9px';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.top = '-10px';
    confetti.style.opacity = '1';
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    confetti.style.zIndex = '9999';
    confetti.style.pointerEvents = 'none';

    document.body.appendChild(confetti);

    const fall = confetti.animate([
      {
        transform: `translate(${(Math.random() - 0.5) * 160}px, 0) rotate(${Math.random() * 360}deg)`,
        opacity: 1,
      },
      {
        transform: `translate(${(Math.random() - 0.5) * 320}px, ${window.innerHeight + 10}px) rotate(${Math.random() * 720}deg)`,
        opacity: 0,
      },
    ], {
      duration: 1800 + Math.random() * 900,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    });

    fall.onfinish = () => confetti.remove();
  }
}

export default function HomeSubmissionForm() {
  const [category, setCategory] = useState<CommunityCategory>(DEFAULT_COMMUNITY_CATEGORY);
  const [isCommitteeSubmission, setIsCommitteeSubmission] = useState(false);
  const [committeeCategory, setCommitteeCategory] = useState<CommitteeCategory>(DEFAULT_COMMITTEE_CATEGORY);
  const [title, setTitle] = useState('');
  const [publishedName, setPublishedName] = useState('');
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [lostFoundType, setLostFoundType] = useState<'Lost' | 'Found'>('Lost');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [childAge, setChildAge] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [importingDocx, setImportingDocx] = useState(false);
  const [docxMessage, setDocxMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const activeCategory: SubmissionCategory = isCommitteeSubmission ? committeeCategory : category;
  const contentLimit = !isCommitteeSubmission && (category === 'Classifieds' || category === 'Local Event Announcement')
    ? 300
    : undefined;
  const contentOverLimit = Boolean(contentLimit && content.length > contentLimit);
  const canUsePhotos = isCommitteeSubmission || (category !== 'Classifieds' && category !== 'Local Event Announcement');

  const helperText = useMemo(() => {
    if (isCommitteeSubmission) {
      return 'Committee submissions will be shown with the committee name in the byline.';
    }
    if (category === 'Classifieds') {
      return 'Classifieds are limited to 300 characters and should not include images.';
    }
    if (category === 'Local Event Announcement') {
      return 'Event announcements are limited to 300 characters. Include the essentials: what, when, where, and how to RSVP.';
    }
    if (category === 'Kids\' Corner') {
      return 'For youth submissions, use the child or correspondent name as the published name. Age is optional.';
    }
    return 'If you are unsure where something belongs, leave this as General Submission / Other.';
  }, [category, isCommitteeSubmission]);

  const resetForm = () => {
    setCategory(DEFAULT_COMMUNITY_CATEGORY);
    setIsCommitteeSubmission(false);
    setCommitteeCategory(DEFAULT_COMMITTEE_CATEGORY);
    setTitle('');
    setPublishedName('');
    setFullName('');
    setLocation('');
    setEmail('');
    setContent('');
    setLostFoundType('Lost');
    setEventDate('');
    setEventTime('');
    setEventEndTime('');
    setEventLocation('');
    setChildAge('');
    setCaptchaToken('');
    setDocxMessage('');
  };

  const importDocx = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setDocxMessage('');

    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.docx')) {
      setDocxMessage('Please choose a .docx Word document.');
      return;
    }

    setImportingDocx(true);
    setError('');

    try {
      const mammothModule = await import('mammoth') as unknown as MammothBrowserModule;
      const mammoth = mammothModule.convertToHtml ? mammothModule : mammothModule.default;
      if (!mammoth) {
        throw new Error('Word document converter did not load.');
      }

      const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      const converted = htmlToMarkdown(result.value);

      if (!converted.trim()) {
        setDocxMessage('That Word document did not contain readable text.');
        return;
      }

      setContent(previous => previous.trim() ? `${previous.trim()}\n\n${converted}` : converted);

      const warnings = result.messages.filter(message => message.type === 'warning');
      setDocxMessage(
        warnings.length > 0
          ? `Imported text from ${file.name}. Some Word formatting may need review.`
          : `Imported text from ${file.name}.`
      );
    } catch (err) {
      console.error('Failed to import Word document:', err);
      setDocxMessage('Could not read that Word document. Please copy and paste the text instead.');
    } finally {
      setImportingDocx(false);
    }
  };

  const buildContent = () => {
    const publishedByline = !isCommitteeSubmission && category === 'Kids\' Corner' && childAge.trim()
      ? `${publishedName.trim()}, age ${childAge.trim()}`
      : publishedName.trim();
    const committeeByline = `${publishedName.trim()}, ${committeeCategory}`;
    const metadataLines: string[] = [];

    if (!isCommitteeSubmission && category === 'Lost & Found') {
      metadataLines.push(`Type: ${lostFoundType.toUpperCase()}`);
    }

    if (!isCommitteeSubmission && category === 'Local Event Announcement') {
      metadataLines.push(`Event Date: ${eventDate}`);
      if (eventTime || eventEndTime) {
        metadataLines.push(`Event Time: ${eventTime}${eventEndTime ? ` - ${eventEndTime}` : ''}`);
      }
      metadataLines.push(`Event Location: ${eventLocation}`);
    }

    metadataLines.push(`Full Name: ${fullName.trim()}`);
    metadataLines.push(`Email: ${email.trim()}`);
    metadataLines.push(`Location: ${location.trim()}`);

    if (isCommitteeSubmission) {
      return [
        `Title: ${title.trim()}`,
        `Author: ${committeeByline}`,
        ...metadataLines,
        '',
        content.trim(),
      ].join('\n');
    }

    return [
      `${publishedByline}${title.trim() ? ` - ${title.trim()}` : ''}`,
      '',
      ...metadataLines,
      '',
      content.trim(),
    ].join('\n');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification.');
      setSubmitting(false);
      return;
    }

    if (contentOverLimit) {
      setError(`Please shorten this submission to ${contentLimit} characters or fewer.`);
      setSubmitting(false);
      return;
    }

    if (!content.trim()) {
      setError('Please enter the submission text.');
      setSubmitting(false);
      return;
    }

    if (!isCommitteeSubmission && category === 'Local Event Announcement' && (!eventDate || !eventLocation.trim())) {
      setError('Please include the event date and event location.');
      setSubmitting(false);
      return;
    }

    const publishedByline = isCommitteeSubmission
      ? `${publishedName.trim()}, ${committeeCategory}`
      : !isCommitteeSubmission && category === 'Kids\' Corner' && childAge.trim()
        ? `${publishedName.trim()}, age ${childAge.trim()}`
        : publishedName.trim();

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: activeCategory,
          content: buildContent(),
          publishedName: publishedByline,
          title: title.trim(),
          contactName: fullName.trim(),
          contactEmail: email.trim(),
          location: location.trim(),
          captchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || data.details || 'Failed to submit. Please try again.');
        return;
      }

      setSuccess(true);
      resetForm();
      createConfetti();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="submit" className="mb-12 rounded-lg border border-orange-200 bg-white p-5 shadow-lg md:p-7">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-orange-950">Send something to The GRIT</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-700">
            Start with the form. Pick a topic only if it is obvious; otherwise leave it on Other and the editor will place it.
          </p>
        </div>
        <a
          href="mailto:griteditor@sandiahomeowners.org"
          className="text-sm font-semibold text-teal-700 underline hover:text-teal-900"
        >
          Prefer email?
        </a>
      </div>

      {success && (
        <div className="mb-5 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">
          Submission received. Thank you for helping make the newsletter feel like the neighborhood.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-orange-950">
              Topic
            </label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as CommunityCategory)}
              className="w-full rounded-md border border-orange-200 bg-white p-3 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
            >
              {COMMUNITY_CATEGORIES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-orange-950">
              Title or heading *
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              className="w-full rounded-md border border-orange-200 p-3 text-gray-900 placeholder:text-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
              placeholder="A short title helps the editor"
            />
          </div>
        </div>

        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {helperText}
        </p>

        {!isCommitteeSubmission && category === 'Lost & Found' && (
          <div>
            <label className="mb-2 block text-sm font-semibold text-orange-950">
              Is this lost or found?
            </label>
            <div className="flex gap-3">
              {(['Lost', 'Found'] as const).map((item) => (
                <label key={item} className="flex items-center gap-2 rounded-md border border-orange-200 bg-white px-3 py-2 text-sm font-medium text-gray-800">
                  <input
                    type="radio"
                    name="lost-found-type"
                    checked={lostFoundType === item}
                    onChange={() => setLostFoundType(item)}
                  />
                  {item}
                </label>
              ))}
            </div>
          </div>
        )}

        {!isCommitteeSubmission && category === 'Local Event Announcement' && (
          <div className="grid grid-cols-1 gap-4 rounded-md border border-orange-200 bg-orange-50/50 p-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-orange-950">
                Event date *
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
                required
                className="w-full rounded-md border border-orange-200 bg-white p-3 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-orange-950">
                Event location *
              </label>
              <input
                type="text"
                value={eventLocation}
                onChange={(event) => setEventLocation(event.target.value)}
                required
                className="w-full rounded-md border border-orange-200 bg-white p-3 text-gray-900 placeholder:text-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                placeholder="Office, park, Zoom, etc."
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-orange-950">
                Start time
              </label>
              <input
                type="time"
                value={eventTime}
                onChange={(event) => setEventTime(event.target.value)}
                className="w-full rounded-md border border-orange-200 bg-white p-3 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-orange-950">
                End time
              </label>
              <input
                type="time"
                value={eventEndTime}
                onChange={(event) => setEventEndTime(event.target.value)}
                className="w-full rounded-md border border-orange-200 bg-white p-3 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
            </div>
          </div>
        )}

        {!isCommitteeSubmission && category === 'Kids\' Corner' && (
          <div className="max-w-xs">
            <label className="mb-2 block text-sm font-semibold text-orange-950">
              Child&apos;s age, if you want it published
            </label>
            <input
              type="number"
              min="1"
              max="18"
              value={childAge}
              onChange={(event) => setChildAge(event.target.value)}
              className="w-full rounded-md border border-orange-200 p-3 text-gray-900 placeholder:text-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
              placeholder="Optional"
            />
          </div>
        )}

        <div className="rounded-md border border-orange-200 bg-orange-50/40 p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-base font-semibold text-orange-950">
              Submission *
            </label>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {canUsePhotos && (
                <button
                  type="button"
                  onClick={() => {
                    const placeholder = '[PHOTO: describe the photo here. Email this photo to griteditor@sandiahomeowners.org]';
                    setContent(content + (content ? '\n\n' : '') + placeholder);
                  }}
                  className="rounded-md border border-teal-300 bg-white px-3 py-1.5 font-semibold text-teal-800 transition hover:bg-teal-50"
                >
                  Add photo note
                </button>
              )}
              <span className={contentOverLimit ? 'font-semibold text-red-700' : 'text-gray-700'}>
                {contentLimit ? `${content.length} / ${contentLimit} characters` : `${getWordCount(content)} words`}
              </span>
            </div>
          </div>

          <p className="mb-3 text-sm leading-5 text-gray-700">
            You can paste from Word. Basic formatting like headings, bold, italics, and lists will be preserved.
          </p>

          <div className="mb-3 rounded-md border border-orange-200 bg-white px-3 py-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-orange-950">Have a Word document?</p>
                <p className="text-xs leading-5 text-gray-600">
                  Import the text into this box. The file is not stored.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-900 transition hover:bg-orange-100">
                {importingDocx ? 'Importing...' : 'Import .docx'}
                <input
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={importDocx}
                  disabled={importingDocx}
                  className="sr-only"
                />
              </label>
            </div>
            {docxMessage && (
              <p className="mt-2 text-xs font-medium text-gray-700">{docxMessage}</p>
            )}
          </div>

          {canUsePhotos && (
            <div className="mb-3 rounded-md border border-teal-300 bg-teal-50 px-3 py-2 text-sm leading-5 text-teal-950">
              <strong>Photos:</strong> Use the button to mark where each photo should go, then email the actual image files to{' '}
              <a href="mailto:griteditor@sandiahomeowners.org" className="font-semibold underline">
                griteditor@sandiahomeowners.org
              </a>
              .
            </div>
          )}

          {contentOverLimit && (
            <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              This category is {content.length - (contentLimit || 0)} characters over the limit.
            </div>
          )}

          <MarkdownEditor
            value={content}
            onChange={setContent}
            placeholder="Paste or type the piece here."
            minHeight="240px"
            simpleToolbar={Boolean(contentLimit)}
            maxLength={contentLimit ? 500 : undefined}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-orange-950">
              Name for publication *
            </label>
            <input
              type="text"
              value={publishedName}
              onChange={(event) => setPublishedName(event.target.value)}
              required
              className="w-full rounded-md border border-orange-200 p-3 text-gray-900 placeholder:text-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
              placeholder={isCommitteeSubmission ? 'Author name' : 'How your name should appear'}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-orange-950">
              Full name, for editor records *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              className="w-full rounded-md border border-orange-200 p-3 text-gray-900 placeholder:text-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
              placeholder="Will not be published"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-orange-950">
              Contact email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-md border border-orange-200 p-3 text-gray-900 placeholder:text-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
              placeholder="Will not be published"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-orange-950">
              Street, cross streets, or unit *
            </label>
            <input
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              required
              className="w-full rounded-md border border-orange-200 p-3 text-gray-900 placeholder:text-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
              placeholder="Will not be published"
            />
          </div>
        </div>

        <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
          <label className="flex items-start gap-3 text-sm font-semibold text-gray-950">
            <input
              type="checkbox"
              checked={isCommitteeSubmission}
              onChange={(event) => setIsCommitteeSubmission(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-400 text-teal-700 focus:ring-teal-600"
            />
            <span>
              I am writing this on behalf of an SHHA committee
              <span className="block pt-1 text-xs font-normal leading-5 text-gray-700">
                Optional. This routes the item to committee content and includes the committee in the byline.
              </span>
            </span>
          </label>

          {isCommitteeSubmission && (
            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-gray-950">
                Committee *
              </label>
              <select
                value={committeeCategory}
                onChange={(event) => setCommitteeCategory(event.target.value as CommitteeCategory)}
                className="w-full rounded-md border border-gray-300 bg-white p-3 text-gray-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
              >
                {COMMITTEE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <Captcha
          onVerify={(token) => setCaptchaToken(token)}
          onError={() => {
            setError('CAPTCHA verification failed. Please try again.');
            setCaptchaToken('');
          }}
          onExpire={() => setCaptchaToken('')}
        />

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !captchaToken || contentOverLimit}
          className="w-full rounded-md bg-orange-700 px-5 py-3 font-semibold text-white shadow transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {submitting ? 'Submitting...' : 'Submit to The GRIT'}
        </button>
      </form>
    </section>
  );
}
