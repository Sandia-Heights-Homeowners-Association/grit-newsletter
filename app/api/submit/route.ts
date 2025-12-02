import { NextRequest, NextResponse } from 'next/server';
import { addSubmission } from '@/lib/store';
import type { SubmissionCategory } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, content, publishedName } = body;

    console.log('Submit API called:', { category, contentLength: content?.length, publishedName });

    if (!category || !content) {
      console.log('Missing required fields');
      return NextResponse.json(
        { error: 'Category and content are required' },
        { status: 400 }
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
