'use client';

import { useState, useEffect } from 'react';
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

  const createConfetti = () => {
    const colors = ['#f97316', '#ea580c', '#dc2626', '#fb923c', '#fdba74'];
    const confettiCount = 100;
    
    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.style.position = 'fixed';
      confetti.style.width = '10px';
      confetti.style.height = '10px';
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
          transform: `translate(${(Math.random() - 0.5) * 200}px, 0) rotate(${Math.random() * 360}deg)`,
          opacity: 1
        },
        { 
          transform: `translate(${(Math.random() - 0.5) * 400}px, ${window.innerHeight + 10}px) rotate(${Math.random() * 720}deg)`,
          opacity: 0
        }
      ], {
        duration: 2000 + Math.random() * 1000,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      });
      
      fall.onfinish = () => confetti.remove();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const metadata = `Full Name: ${fullName}\nEmail: ${email}\nLocation: ${location}`;
      const fullContent = `${publishedName}\n\n${metadata}\n\n${content}`;
      
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, content: fullContent, publishedName }),
      });

      if (response.ok) {
        setSuccess(true);
        createConfetti();
        setContent('');
        setPublishedName('');
        setFullName('');
        setLocation('');
        setEmail('');
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
      'Classifieds': 'Looking to buy, sell, trade, or offer services? Post your classified ad here. Include details like pricing, contact preferences, and any relevant specifics. You will not receive an email confirmation, but the editor will reach out if clarification is needed. You can email photos to griteditor@sandiahomeowners.org, or upload them to a 3rd party service and share a link within your submisison.',
      'Lost & Found': 'Help reunite neighbors with their lost items or report found property. Please include a description, approximate location, and date. You will not receive an email confirmation, but the editor will reach out if clarification is needed. You can email photos to griteditor@sandiahomeowners.org, or upload them to a 3rd party service and share a link within your submisison.',
      'On My Mind': 'Share your thoughts, observations, or opinions about our community, local issues, or neighborhood life. Keep it respectful and constructive. You will not receive an email confirmation, but the editor will reach out if clarification is needed. You can email photos to griteditor@sandiahomeowners.org, or upload them to a 3rd party service and share a link within your submisison.',
      'Response to Prior Content': 'Respond to articles, letters, or content from previous GRIT issues. Please reference the specific article or month you\'re responding to. You will not receive an email confirmation, but the editor will reach out if clarification is needed. You can email photos to griteditor@sandiahomeowners.org, or upload them to a 3rd party service and share a link within your submisison.',
      'Local Event Announcement': 'Promote upcoming neighborhood events, gatherings, or community activities. Include date, time, location, and how to RSVP or get more information. You will not receive an email confirmation, but the editor will reach out if clarification is needed. You can email photos to griteditor@sandiahomeowners.org, or upload them to a 3rd party service and share a link within your submisison.',
      'Kids\' Corner': 'Submit jokes, drawings, stories, poems, or other creative work from young residents. Parents: please submit on behalf of your child and include their age if you\'d like. You will not receive an email confirmation, but the editor will reach out if clarification is needed. You can email photos to griteditor@sandiahomeowners.org, or upload them to a 3rd party service and share a link within your submisison.',
      'DIY & Crafts': 'Share your favorite recipes, craft projects, gardening tips, or DIY home improvement advice. Include step-by-step instructions if applicable. You will not receive an email confirmation, but the editor will reach out if clarification is needed. You can email photos to griteditor@sandiahomeowners.org, or upload them to a 3rd party service and share a link within your submisison.',
      'Neighbor Appreciation': 'Recognize, thank, or celebrate a neighbor who has made a positive impact. Share what they did and why it matters to you. You will not receive an email confirmation, but the editor will reach out if clarification is needed. You can email photos to griteditor@sandiahomeowners.org, or upload them to a 3rd party service and share a link within your submisison.',
      'Nature & Wildlife': 'Share wildlife sightings, nature photography, unusual plants, or environmental observations from around Sandia Heights. You will not receive an email confirmation, but the editor will reach out if clarification is needed. You can email photos to griteditor@sandiahomeowners.org, or upload them to a 3rd party service and share a link within your submisison.',
    };
    return descriptions[category] || 'Share your contribution with the Sandia Heights community. You will not receive an email confirmation, but the editor will reach out if clarification is needed. You can email photos to griteditor@sandiahomeowners.org, or upload them to a 3rd party service and share a link within your submisison.';
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
              <button
                onClick={createConfetti}
                className="mt-4 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-orange-700 hover:to-red-700 hover:shadow-xl"
              >
                🎉 More Confetti
              </button>
              <Link 
                href="/"
                className="mt-4 block text-orange-700 hover:text-orange-900 font-medium"
              >
                ← Back to Dashboard
              </Link>
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
                  placeholder="e.g. Tramway & Live Oak"
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
                <div className="mb-2 flex items-center justify-between">
                  <label className="font-semibold text-orange-900">
                    Your Submission *
                  </label>
                  <span className="text-sm text-gray-600">
                    {content.trim().split(/\s+/).filter(word => word.length > 0).length} words
                  </span>
                </div>
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
