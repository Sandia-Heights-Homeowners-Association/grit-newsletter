import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db';
import { normalizeHomepageContent, type HomepageContent } from '@/lib/homepage-content';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let initialized = false;
async function ensureInit() {
  if (!initialized) {
    await initializeDatabase();
    initialized = true;
  }
}

export async function GET() {
  try {
    await ensureInit();
    const saved = await db.getConfig<Partial<HomepageContent>>('homepage_content');
    return NextResponse.json(normalizeHomepageContent(saved));
  } catch (error) {
    console.error('Homepage content GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load homepage content' },
      { status: 500 }
    );
  }
}
