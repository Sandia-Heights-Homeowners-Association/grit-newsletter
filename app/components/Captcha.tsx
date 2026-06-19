'use client';

import { Turnstile } from '@marsidev/react-turnstile';
import { useEffect, useRef, useState } from 'react';

interface CaptchaProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export default function Captcha({ onVerify, onError, onExpire }: CaptchaProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let isMounted = true;

    async function loadPublicConfig() {
      try {
        const response = await fetch('/api/public-config', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to load public config');
        }
        const config = await response.json();
        if (isMounted) {
          setSiteKey(config.turnstileSiteKey);
        }
      } catch (error) {
        console.error('CAPTCHA config error:', error);
        if (isMounted) {
          setIsLoading(false);
          onErrorRef.current?.();
        }
      }
    }

    loadPublicConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="mb-6">
      <label className="mb-2 block font-semibold text-orange-900">
        Verify you&rsquo;re human *
      </label>
      <div className="rounded-lg border-2 border-orange-200 p-4 bg-orange-50/30">
        {isLoading && (
          <div className="text-sm text-gray-600 mb-2">Loading verification...</div>
        )}
        {siteKey && (
          <Turnstile
            siteKey={siteKey}
            onSuccess={(token) => {
              setIsLoading(false);
              onVerify(token);
            }}
            onError={() => {
              setIsLoading(false);
              onError?.();
            }}
            onExpire={() => {
              onExpire?.();
            }}
            options={{
              theme: 'light',
              size: 'normal',
            }}
          />
        )}
        <p className="text-xs text-gray-600 mt-2">
          Protected by Cloudflare Turnstile
        </p>
        <details className="mt-3 text-xs">
          <summary className="text-orange-700 cursor-pointer hover:text-orange-900 font-medium">
            CAPTCHA not loading? (Firefox users)
          </summary>
          <div className="mt-2 p-2 bg-white rounded border border-orange-200 text-gray-700">
            <p className="mb-2">If the CAPTCHA doesn&rsquo;t appear or work:</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>Disable Enhanced Tracking Protection for this site (shield icon in address bar)</li>
              <li>Disable privacy extensions (uBlock, Privacy Badger, etc.) for this page</li>
              <li>Allow third-party cookies for sandiaheightsgrit.app</li>
              <li>Try a different browser (Chrome, Safari, Edge)</li>
            </ul>
            <p className="mt-2 text-orange-700">
              Still having issues? Email your submission to <a href="mailto:griteditor@sandiahomeowners.org" className="underline">griteditor@sandiahomeowners.org</a>
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
