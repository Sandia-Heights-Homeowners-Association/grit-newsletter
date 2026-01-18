'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Captcha from '@/app/components/Captcha';

export default function ClassifiedsPage() {
  const [content, setContent] = useState('');
  const [publishedName, setPublishedName] = useState('');
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
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

    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification');
      setSubmitting(false);
      return;
    }

    try {
      const metadata = `Full Name: ${fullName}\nEmail: ${email}\nLocation: ${location}`;
      const fullContent = `${publishedName}${title ? ` - ${title}` : ''}\n\n${metadata}\n\n${content}`;
      
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'Classifieds', content: fullContent, publishedName, captchaToken }),
      });

      if (response.ok) {
        setSuccess(true);
        createConfetti();
        setContent('');
        setPublishedName('');
        setFullName('');
        setLocation('');
        setEmail('');
        setTitle('');
        setCaptchaToken('');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit. Please try again.');
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
        <Header />
        <Link 
          href="/"
          className="mb-6 inline-block font-semibold text-orange-700 hover:text-orange-900"
        >
          ← Back to Dashboard
        </Link>

        <div className="rounded-xl bg-white p-8 shadow-xl border-2 border-orange-200">
          <h1 className="mb-4 text-3xl font-bold text-orange-900">
            Classifieds
          </h1>
          
          <div className="mb-6">
            <p className="text-gray-800 leading-relaxed mb-2 text-base">
              Looking to buy, sell, trade, or offer services? Post your classified ad here. Include details like pricing, contact preferences, and any relevant specifics. Please keep it reasonably short.
            </p>
            <p className="text-sm text-gray-600">
              If you have photos, please mention in your text where they should appear (e.g., "photo here"), then email photos to griteditor@sandiahomeowners.org or include a link in your description.
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
              {/* Two Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Published Info */}
                <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50/30">
                  <h3 className="text-sm font-bold text-green-700 mb-3 uppercase">Will be Published</h3>
                  <div className="mb-4">
                    <label className="mb-2 block font-semibold text-orange-900 text-sm">
                      Name for Publication *
                    </label>
                    <input
                      type="text"
                      value={publishedName}
                      onChange={(e) => setPublishedName(e.target.value)}
                      required
                      className="w-full rounded-lg border-2 border-orange-200 p-2 text-amber-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none placeholder:text-amber-600 text-sm"
                      placeholder="Your name as you want it to appear"
                    />
                  </div>
                </div>

                {/* Private Info */}
                <div className="border-2 border-gray-200 rounded-lg p-4 bg-gray-50/30">
                  <h3 className="text-sm font-bold text-gray-600 mb-3 uppercase">Will Not be Published</h3>
                  <div className="mb-4">
                    <label className="mb-2 block font-semibold text-orange-900 text-sm">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full rounded-lg border-2 border-orange-200 p-2 text-amber-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none placeholder:text-amber-600 text-sm"
                      placeholder="For our records"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="mb-2 block font-semibold text-orange-900 text-sm">
                      Location *
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      className="w-full rounded-lg border-2 border-orange-200 p-2 text-amber-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none placeholder:text-amber-600 text-sm"
                      placeholder="e.g. Tramway & Live Oak"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="mb-2 block font-semibold text-orange-900 text-sm">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-lg border-2 border-orange-200 p-2 text-amber-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none placeholder:text-amber-600 text-sm"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="mb-2 block font-semibold text-orange-900 text-sm">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border-2 border-orange-200 p-2 text-amber-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none placeholder:text-amber-600 text-sm"
                  placeholder="Give your ad a title"
                />
              </div>

              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <label className="font-semibold text-orange-900 text-sm">
                    Your Classified Ad *
                  </label>
                  <span className="text-sm text-gray-600">
                    {content.trim().split(/\s+/).filter(word => word.length > 0).length} words
                  </span>
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  rows={5}
                  className="w-full rounded-lg border-2 border-orange-200 p-3 text-amber-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none placeholder:text-amber-600 text-sm"
                  placeholder="Brief description with pricing, contact info, and details..."
                />
              </div>

              <div className="mb-4 rounded-lg bg-blue-50 p-4 border-2 border-blue-200">
                <p className="text-sm text-blue-900">📧 Email Confirmation: You will receive an email confirmation of your submission. If you don't receive it, please check your spam folder.</p>
              </div>

              <Captcha 
                onVerify={(token) => setCaptchaToken(token)}
                onError={() => {
                  setError('CAPTCHA verification failed. Please try again.');
                  setCaptchaToken('');
                }}
                onExpire={() => {
                  setCaptchaToken('');
                }}
              />

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-900 border-2 border-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !captchaToken}
                className="w-full rounded-lg bg-gradient-to-r from-orange-600 to-red-600 py-3 font-semibold text-white shadow-lg transition hover:from-orange-700 hover:to-red-700 hover:shadow-xl disabled:bg-gray-400 disabled:cursor-not-allowed"
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
