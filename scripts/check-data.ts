/**
 * Check submission data to debug missing routine/committee content
 */

import { list } from '@vercel/blob';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUBMISSIONS_BLOB = 'submissions.json';

async function checkData() {
  console.log('Checking submission data...\n');

  try {
    const { blobs } = await list({ prefix: SUBMISSIONS_BLOB });
    const exactBlob = blobs.find(b => b.pathname === SUBMISSIONS_BLOB);
    
    if (!exactBlob) {
      console.log('❌ No submissions.json found');
      return;
    }

    const response = await fetch(exactBlob.url);
    const submissions = await response.json();
    
    console.log(`Total submissions: ${submissions.length}\n`);
    
    // Group by category
    const byCategory: Record<string, any[]> = {};
    submissions.forEach((s: any) => {
      if (!byCategory[s.category]) {
        byCategory[s.category] = [];
      }
      byCategory[s.category].push(s);
    });
    
    // Show routine and committee categories
    const routineCategories = [
      "President's Note",
      'Board Notes',
      'Office Notes',
      'ACC Activity Log',
      'CSC Table',
      'Security Report',
    ];
    
    const committeeCategories = [
      'Architectural Control Committee (ACC)',
      'Covenant Support Committee (CSC)',
      'Communications & Publications Committee',
      'Community Service & Membership Committee',
      'Environment & Safety Committee',
      'Executive Committee',
      'Finance Committee',
    ];
    
    console.log('=== ROUTINE CONTENT ===');
    routineCategories.forEach(cat => {
      const subs = byCategory[cat] || [];
      console.log(`\n${cat}: ${subs.length} submissions`);
      subs.forEach((s: any) => {
        console.log(`  - ID: ${s.id.substring(0, 8)}... | Month: ${s.month} | Disposition: ${s.disposition || 'unreviewed'}`);
        console.log(`    Content preview: ${s.content.substring(0, 60)}...`);
      });
    });
    
    console.log('\n\n=== COMMITTEE CONTENT ===');
    committeeCategories.forEach(cat => {
      const subs = byCategory[cat] || [];
      console.log(`\n${cat}: ${subs.length} submissions`);
      subs.forEach((s: any) => {
        console.log(`  - ID: ${s.id.substring(0, 8)}... | Month: ${s.month} | Disposition: ${s.disposition || 'unreviewed'}`);
        console.log(`    Content preview: ${s.content.substring(0, 60)}...`);
      });
    });
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

checkData();
