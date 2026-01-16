import { NextRequest, NextResponse } from 'next/server';
import { addSubmission } from '@/lib/store';
import type { SubmissionCategory } from '@/lib/types';

// Verify Cloudflare Turnstile token
async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  
  if (!secretKey) {
    console.error('TURNSTILE_SECRET_KEY not configured');
    // In development, allow submissions without secret key
    if (process.env.NODE_ENV === 'development') {
      console.warn('Development mode: Skipping CAPTCHA verification');
      return true;
    }
    return false;
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, content, publishedName, captchaToken } = body;

    console.log('Submit API called:', { category, contentLength: content?.length, publishedName });

    // Verify required fields
    if (!category || !content) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: 'Category and content are required' },
        { status: 400 }
      );
    }

    // Verify CAPTCHA token
    if (!captchaToken) {
      console.log('Missing CAPTCHA token');
      return NextResponse.json(
        { error: 'Please complete the CAPTCHA verification' },
        { status: 400 }
      );
    }

    const isValidCaptcha = await verifyTurnstileToken(captchaToken);
    if (!isValidCaptcha) {
      console.log('Invalid CAPTCHA token');
      return NextResponse.json(
        { error: 'CAPTCHA verification failed. Please try again.' },
        { status: 403 }
      );
    }

    const submission = await addSubmission(category as SubmissionCategory, content, publishedName);
    
    console.log('Submission created successfully:', submission.id);
    
    return NextResponse.json({ 
      success: true, 
      submission 
    });
  } catch (error: any) {
    console.error('Submission error:', error);
    console.error('Error details:', error.message, error.stack);
    return NextResponse.json(
      { error: 'Failed to submit', details: error.message },
      { status: 500 }
    );
  }
}
