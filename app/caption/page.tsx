'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/app/components/Header';
import Captcha from '@/app/components/Captcha';

interface ContestData {
  enabled: boolean;
  imageData: string | null;
  imageType: string | null;
  title: string | null;
  description: string | null;
}

export default function CaptionPage() {
  const [contest, setContest] = useState<ContestData | null>(null);
  const [loading, setLoading] = useState(true);

  const [publishedName, setPublishedName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [caption, setCaption] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/caption')
      .then(res => res.json())
      .then(data => {
        setContest(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const createConfetti = () => {
    const colors = ['#f97316', '#ea580c', '#dc2626', '#fb923c', '#fdba74'];
    for (let i = 0; i < 100; i++) {
      const el = document.createElement('div');
      el.style.cssText = `position:fixed;width:10px;height:10px;background:${colors[Math.floor(Math.random() * colors.length)]};left:${Math.random() * 100}%;top:-10px;opacity:1;transform:rotate(${Math.random() * 360}deg);z-index:9999;pointer-events:none`;
      document.body.appendChild(el);
      const anim = el.animate([
        { transform: `translate(${(Math.random() - 0.5) * 200}px, 0) rotate(${Math.random() * 360}deg)`, opacity: 1 },
        { transform: `translate(${(Math.random() - 0.5) * 400}px, ${window.innerHeight + 10}px) rotate(${Math.random() * 720}deg)`, opacity: 0 },
      ], { duration: 2000 + Math.random() * 1000, easing: 'cubic-bezier(0.25,0.46,0.45,0.94)' });
      anim.onfinish = () => el.remove();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification.');
      return;
    }
    if (caption.length > 300) {
      setError('Caption must be 300 characters or fewer.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishedName, fullName, email, location, caption, captchaToken }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        createConfetti();
      } else {
        setError(data.error || 'Failed to submit. Please try again.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center">
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  if (!contest?.enabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
        <main className="mx-auto max-w-2xl px-4 py-12">
          <Header />
          <Link href="/" className="mb-6 inline-block font-semibold text-orange-700 hover:text-orange-900">
            ← Back to Dashboard
          </Link>
          <div className="rounded-xl bg-white p-8 shadow-xl border-2 border-orange-200 text-center">
            <div className="mb-4 text-5xl">🏆</div>
            <h1 className="mb-3 text-3xl font-bold text-orange-900">Caption Contest</h1>
            <p className="text-gray-600">There is no caption contest running right now. Check back next issue!</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      <main className="mx-auto max-w-2xl px-4 py-12">
        <Header />
        <Link href="/" className="mb-6 inline-block font-semibold text-orange-700 hover:text-orange-900">
          ← Back to Dashboard
        </Link>

        <div className="rounded-xl bg-white p-8 shadow-xl border-2 border-orange-200">
          <div className="mb-2 flex items-center gap-3">
            <span className="text-4xl">🏆</span>
            <h1 className="text-3xl font-bold text-orange-900">
              {contest.title || 'Caption Contest'}
            </h1>
          </div>

          {contest.description && (
            <p className="mb-6 text-gray-700">{contest.description}</p>
          )}

          {/* Contest Image */}
          {contest.imageData && (
            <div className="mb-6 overflow-hidden rounded-xl border-2 border-orange-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={contest.imageData}
                alt="Caption contest photo"
                className="w-full object-contain max-h-[480px]"
              />
            </div>
          )}

          <p className="mb-6 text-sm text-gray-600">
            Write your best caption for the photo above — <strong>300 characters max</strong>. Winners may be published in an upcoming issue of The GRIT.
          </p>

          {success ? (
            <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-100 p-6 text-center border-2 border-green-300">
              <div className="mb-4 text-6xl">✓</div>
              <h2 className="mb-2 text-2xl font-bold text-green-900">Entry Received!</h2>
              <p className="text-gray-900">Thanks for entering — good luck!</p>
              <button
                onClick={createConfetti}
                className="mt-4 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-orange-700 hover:to-red-700"
              >
                🎉 More Confetti
              </button>
              <Link href="/" className="mt-4 block text-orange-700 hover:text-orange-900 font-medium">
                ← Back to Dashboard
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Two-column layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Published */}
                <div className="rounded-lg border-2 border-green-200 bg-green-50/30 p-4">
                  <h3 className="mb-3 text-sm font-bold uppercase text-green-700">Will Be Published</h3>
                  <label className="mb-1 block text-sm font-semibold text-orange-900">Name for Publication *</label>
                  <input
                    type="text"
                    value={publishedName}
                    onChange={e => setPublishedName(e.target.value)}
                    required
                    placeholder="Your name as you want it to appear"
                    className="w-full rounded-lg border-2 border-orange-200 p-2 text-sm text-amber-700 placeholder:text-amber-600 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                  />
                </div>

                {/* Private */}
                <div className="rounded-lg border-2 border-gray-200 bg-gray-50/30 p-4">
                  <h3 className="mb-3 text-sm font-bold uppercase text-gray-600">Will Not Be Published</h3>
                  <div className="mb-3">
                    <label className="mb-1 block text-sm font-semibold text-orange-900">Full Name *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      required
                      placeholder="For our records"
                      className="w-full rounded-lg border-2 border-orange-200 p-2 text-sm text-amber-700 placeholder:text-amber-600 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="mb-1 block text-sm font-semibold text-orange-900">Your Location *</label>
                    <input
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      required
                      placeholder="e.g. Tramway & Live Oak"
                      className="w-full rounded-lg border-2 border-orange-200 p-2 text-sm text-amber-700 placeholder:text-amber-600 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-orange-900">Email *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="your.email@example.com"
                      className="w-full rounded-lg border-2 border-orange-200 p-2 text-sm text-amber-700 placeholder:text-amber-600 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                    />
                  </div>
                </div>
              </div>

              {/* Caption */}
              <div className="mb-6">
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-semibold text-orange-900">Your Caption *</label>
                  <span className={`text-sm font-medium ${caption.length > 300 ? 'text-red-600' : 'text-gray-500'}`}>
                    {caption.length} / 300{caption.length > 300 && ' — over limit'}
                  </span>
                </div>
                {caption.length > 300 && (
                  <div className="mb-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                    Your caption is {caption.length - 300} character{caption.length - 300 === 1 ? '' : 's'} over the limit.
                  </div>
                )}
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  required
                  maxLength={500}
                  rows={4}
                  placeholder="Write your caption here…"
                  className="w-full rounded-lg border-2 border-orange-200 p-3 text-sm text-amber-700 placeholder:text-amber-600 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 resize-none"
                />
              </div>

              <Captcha
                onVerify={token => setCaptchaToken(token)}
                onError={() => { setError('CAPTCHA verification failed. Please try again.'); setCaptchaToken(''); }}
                onExpire={() => setCaptchaToken('')}
              />

              {error && (
                <div className="mb-4 rounded-lg border-2 border-red-300 bg-red-50 p-4 text-red-900">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !captchaToken || caption.length > 300}
                className="w-full rounded-lg bg-gradient-to-r from-orange-600 to-red-600 py-3 font-semibold text-white shadow-lg transition hover:from-orange-700 hover:to-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {submitting ? 'Submitting…' : 'Submit Caption'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
