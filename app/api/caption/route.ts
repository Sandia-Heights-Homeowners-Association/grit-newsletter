import { NextRequest, NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db';
import { sendCaptionConfirmation } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let initialized = false;
async function ensureInit() {
  if (!initialized) {
    await initializeDatabase();
    initialized = true;
  }
}

async function verifyTurnstile(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    if (process.env.NODE_ENV === 'development') return true;
    return false;
  }
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secretKey, response: token }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// GET — public: returns contest status + image (no auth required)
export async function GET() {
  try {
    await ensureInit();
    const contest = await db.getCaptionContest();
    // Never send the raw base64 image back in the enabled-check response;
    // send it only when the contest is enabled so the page can display it.
    return NextResponse.json({
      enabled: contest.enabled,
      imageData: contest.enabled ? contest.imageData : null,
      imageType: contest.enabled ? contest.imageType : null,
      title: contest.title,
      description: contest.description,
    });
  } catch (error) {
    console.error('Caption GET error:', error);
    return NextResponse.json({ error: 'Failed to load contest' }, { status: 500 });
  }
}

// POST — public: submit a caption entry
export async function POST(request: NextRequest) {
  try {
    await ensureInit();

    const body = await request.json();
    const { publishedName, fullName, email, location, caption, captchaToken } = body;

    // Validate required fields
    if (!publishedName || !fullName || !email || !location || !caption) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (!captchaToken) {
      return NextResponse.json({ error: 'Please complete the CAPTCHA verification' }, { status: 400 });
    }

    // Validate caption length
    if (caption.length > 300) {
      return NextResponse.json({ error: 'Caption must be 300 characters or fewer' }, { status: 400 });
    }

    // Verify contest is active
    const contest = await db.getCaptionContest();
    if (!contest.enabled) {
      return NextResponse.json({ error: 'The caption contest is not currently active' }, { status: 403 });
    }

    // Verify CAPTCHA
    const valid = await verifyTurnstile(captchaToken);
    if (!valid) {
      return NextResponse.json({ error: 'CAPTCHA verification failed. Please try again.' }, { status: 403 });
    }

    await db.insertCaption({
      id: generateId(),
      publishedName,
      fullName,
      email,
      location,
      caption,
    });

    // Send confirmation email (non-blocking)
    sendCaptionConfirmation({ publishedName, fullName, email, caption }).catch(err => {
      console.error('Caption confirmation email failed:', err);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Caption POST error:', error);
    return NextResponse.json({ error: 'Failed to submit caption' }, { status: 500 });
  }
}
