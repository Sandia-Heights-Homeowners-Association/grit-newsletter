import { NextRequest, NextResponse } from 'next/server';
import { addSubmission } from '@/lib/store';
import type { SubmissionCategory } from '@/lib/types';
import { sendSubmissionNotification, sendSubmitterConfirmation } from '@/lib/email';
import { normalizeEmail, normalizeText, parseSubmissionMetadata } from '@/lib/submissionMetadata';

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
    const { category, content, captchaToken } = body;
    const parsedMetadata = parseSubmissionMetadata(content || '');
    const publishedName = normalizeText(body.publishedName) || parsedMetadata.publishedName || 'Anonymous';
    const title = normalizeText(body.title) || parsedMetadata.title;
    const fullName = normalizeText(body.contactName) || normalizeText(body.fullName) || parsedMetadata.contactName;
    const email = normalizeEmail(body.contactEmail) || normalizeEmail(body.email) || normalizeEmail(parsedMetadata.contactEmail);
    const location = normalizeText(body.location) || parsedMetadata.location || '';

    console.log('Submit API called:', { category, contentLength: content?.length, publishedName, contactEmail: email });

    // Verify required fields
    if (!category || !content) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: 'Category and content are required' },
        { status: 400 }
      );
    }

    if (!fullName || !email) {
      return NextResponse.json(
        { error: 'Name and contact email are required' },
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

    const submission = await addSubmission(category as SubmissionCategory, content, {
      publishedName,
      title,
      contactName: fullName,
      contactEmail: email,
      location,
      itemType: 'submission',
    });
    
    console.log('Submission created successfully:', submission.id);

    const [submitterConfirmation, editorNotification] = await Promise.all([
      sendSubmitterConfirmation({
        category,
        publishedName,
        content,
        fullName,
        email,
      }),
      sendSubmissionNotification({
        category,
        publishedName,
        content,
        fullName,
        email,
        location,
      }),
    ]);
    
    return NextResponse.json({ 
      success: true, 
      submission,
      email: {
        submitterConfirmation,
        editorNotification,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown submission error';
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('Submission error:', error);
    console.error('Error details:', message, stack);
    return NextResponse.json(
      { error: 'Failed to submit', details: message },
      { status: 500 }
    );
  }
}
