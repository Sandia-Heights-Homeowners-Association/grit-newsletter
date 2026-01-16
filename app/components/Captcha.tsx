'use client';

import { Turnstile } from '@marsidev/react-turnstile';
import { useState } from 'react';

interface CaptchaProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export default function Captcha({ onVerify, onError, onExpire }: CaptchaProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="mb-6">
      <label className="mb-2 block font-semibold text-orange-900">
        Verify you're human *
      </label>
      <div className="rounded-lg border-2 border-orange-200 p-4 bg-orange-50/30">
        {isLoading && (
          <div className="text-sm text-gray-600 mb-2">Loading verification...</div>
        )}
        <Turnstile
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
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
        <p className="text-xs text-gray-600 mt-2">
          Protected by Cloudflare Turnstile
        </p>
      </div>
    </div>
  );
}
