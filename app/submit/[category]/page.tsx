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

  const getCategoryDescription = (category: string): string => {
    const descriptions: Record<string, string> = {
      'Classifieds': 'Looking to buy, sell, trade, or offer services? Post your classified ad here. Include details like pricing, contact preferences, and any relevant specifics. You will not receive an email confirmation, but the editor will reach out if clarification is needed.',
      'Lost & Found': 'Help reunite neighbors with their lost items or report found property. Please include a description, approximate location, and date. You will not receive an email confirmation, but the editor will reach out if clarification is needed.',
      'On My Mind': 'Share your thoughts, observations, or opinions about our community, local issues, or neighborhood life. Keep it respectful and constructive. You will not receive an email confirmation, but the editor will reach out if clarification is needed.',
      'Response to Prior Content': 'Respond to articles, letters, or content from previous GRIT issues. Please reference the specific article or month you\'re responding to. You will not receive an email confirmation, but the editor will reach out if clarification is needed.',
      'Local Event Announcement': 'Promote upcoming neighborhood events, gatherings, or community activities. Include date, time, location, and how to RSVP or get more information. You will not receive an email confirmation, but the editor will reach out if clarification is needed.',
      'Kids\' Corner': 'Submit jokes, drawings, stories, poems, or other creative work from young residents. Parents: please submit on behalf of your child and include their age if you\'d like. You will not receive an email confirmation, but the editor will reach out if clarification is needed.',
      'DIY & Crafts': 'Share your favorite recipes, craft projects, gardening tips, or DIY home improvement advice. Include step-by-step instructions if applicable. You will not receive an email confirmation, but the editor will reach out if clarification is needed.',
      'Neighbor Appreciation': 'Recognize, thank, or celebrate a neighbor who has made a positive impact. Share what they did and why it matters to you. You will not receive an email confirmation, but the editor will reach out if clarification is needed.',
      'Nature & Wildlife': 'Share wildlife sightings, nature photography, unusual plants, or environmental observations from around Sandia Heights. You will not receive an email confirmation, but the editor will reach out if clarification is needed.',
    };
    return descriptions[category] || 'Share your contribution with the Sandia Heights community. You will not receive an email confirmation, but the editor will reach out if clarification is needed.';
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
          
          <div className="mb-6">
            <p className="text-gray-800 leading-relaxed">
              {getCategoryDescription(category)}
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
                  className="w-full rounded-lg border-2 border-orange-200 p-3 text-amber-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none placeholder:text-amber-600"
                  placeholder="How you want your name to appear in the newsletter"
                />
              </div>

              <div className="mb-4">
                <label className="mb-2 block font-semibold text-orange-900">
                  Your Full Name (will not be published) *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full rounded-lg border-2 border-orange-200 p-3 text-amber-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none placeholder:text-amber-600"
                  placeholder="Your complete name for our records"
                />
              </div>

              <div className="mb-4">
                <label className="mb-2 block font-semibold text-orange-900">
                  Your Street, Cross Streets, or Unit Number (will not be published) *
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  className="w-full rounded-lg border-2 border-orange-200 p-3 text-amber-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none placeholder:text-amber-600"
                  placeholder="e.g., 'Tramway near Copper' or 'Unit 123'"
                />
              </div>

              <div className="mb-4">
                <label className="mb-2 block font-semibold text-orange-900">
                  Your Email Address (will not be published) *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border-2 border-orange-200 p-3 text-amber-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none placeholder:text-amber-600"
                  placeholder="your.email@example.com"
                />
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
                  className="w-full rounded-lg border-2 border-orange-200 p-3 text-amber-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none placeholder:text-amber-600"
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
