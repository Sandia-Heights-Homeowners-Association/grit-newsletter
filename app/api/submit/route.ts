import { NextRequest, NextResponse } from 'next/server';
import { addSubmission } from '@/lib/store';
import type { SubmissionCategory } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, content, publishedName } = body;

    if (!category || !content) {
      return NextResponse.json(
        { error: 'Category and content are required' },
        { status: 400 }
      );
    }

    const submission = await addSubmission(category as SubmissionCategory, content, publishedName);
    
    return NextResponse.json({ 
      success: true, 
      submission 
    });
  } catch (error) {
    console.error('Submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit' },
      { status: 500 }
    );
  }
}
