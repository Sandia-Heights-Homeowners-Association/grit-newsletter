'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SubmitPage() {
  const params = useParams();
  const router = useRouter();
  const category = decodeURIComponent(params.category as string);
  
  const [content, setContent] = useState('');
  const [publishedName, setPublishedName] = useState('');
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const fullContent = `Published Name: ${publishedName}\nFull Name: ${fullName}\nEmail: ${email}\nLocation: ${location}\n\n${content}`;
      
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, content: fullContent, publishedName }),
      });

      if (response.ok) {
        setSuccess(true);
        setContent('');
        setPublishedName('');
        setFullName('');
        setLocation('');
        setEmail('');
        setTimeout(() => router.push('/'), 3000);
      } else {
        setError('Failed to submit. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <main className="mx-auto max-w-3xl px-4 py-12">
        <Link 
          href="/"
          className="mb-6 inline-block font-semibold text-orange-700 hover:text-orange-900"
        >
          ← Back to Dashboard
        </Link>

        <div className="rounded-xl bg-white p-8 shadow-xl border-2 border-orange-200">
          <h1 className="mb-4 text-3xl font-bold text-orange-900">
            Submit: {category}
          </h1>
          
          <div className="mb-6 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 p-4 border-2 border-orange-200">
            <p className="text-gray-900 font-medium">
              Share your stories, announcements, and contributions with the Sandia Heights community. 
              Your submission will be reviewed by our editors and may be included in the next issue of The GRIT.
            </p>
          </div>

          {success ? (
            <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-100 p-6 text-center border-2 border-green-300">
              <div className="mb-4 text-6xl">✓</div>
              <h2 className="mb-2 text-2xl font-bold text-green-900">
                Submission Successful!
              </h2>
              <p className="text-gray-900">
                Thank you for your contribution to The GRIT.
              </p>
              <p className="mt-2 text-sm text-gray-700">
                Redirecting to dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="mb-2 block font-semibold text-orange-900">
                  Your Name (as you would like it published) *
                </label>
                <input
                  type="text"
                  value={publishedName}
                  onChange={(e) => setPublishedName(e.target.value)}
                  required
                  className="w-full rounded-lg border-2 border-orange-200 p-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
                  placeholder="How you want your name to appear in the newsletter"
                />
              </div>

              <div className="mb-4">
                <label className="mb-2 block font-semibold text-orange-900">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full rounded-lg border-2 border-orange-200 p-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
                  placeholder="Your complete name for our records"
                />
              </div>

              <div className="mb-4">
                <label className="mb-2 block font-semibold text-orange-900">
                  Your Street, Cross Streets, or Unit Number *
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  className="w-full rounded-lg border-2 border-orange-200 p-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
                  placeholder="e.g., 'Tramway near Copper' or 'Unit 123'"
                />
              </div>

              <div className="mb-4">
                <label className="mb-2 block font-semibold text-orange-900">
                  Your Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border-2 border-orange-200 p-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
                  placeholder="your.email@example.com"
                />
                <p className="mt-1 text-sm text-gray-800">For follow-up questions only. Will not be published.</p>
              </div>

              <div className="mb-6">
                <label className="mb-2 block font-semibold text-orange-900">
                  Your Submission *
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={10}
                  className="w-full rounded-lg border-2 border-orange-200 p-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none"
                  placeholder="Enter your content here..."
                />
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-900 border-2 border-red-300">
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
          )}
        </div>
      </main>
    </div>
  );
}
