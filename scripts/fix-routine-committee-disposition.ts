/**
 * Fix routine/committee submission dispositions to January 2026
 */

import { list, put, del } from '@vercel/blob';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUBMISSIONS_BLOB = 'submissions.json';

const ROUTINE_CATEGORIES = [
  "President's Note",
  'Board Notes',
  'Office Notes',
  'ACC Activity Log',
  'CSC Table',
  'Security Report',
];

const COMMITTEE_CATEGORIES = [
  'Architectural Control Committee (ACC)',
  'Covenant Support Committee (CSC)',
  'Communications & Publications Committee',
  'Community Service & Membership Committee',
  'Environment & Safety Committee',
  'Executive Committee',
  'Finance Committee',
];

async function fixDispositions() {
  console.log('Fixing routine/committee submission dispositions...\n');

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
    
    const routineAndCommittee = [...ROUTINE_CATEGORIES, ...COMMITTEE_CATEGORIES];
    
    // These should be accepted for January 2026, not December 2025
    const targetDisposition = '2026-01';
    
    let fixedCount = 0;
    const fixedSubmissions = submissions.map((s: any) => {
      if (routineAndCommittee.includes(s.category) && s.disposition === '2025-12') {
        console.log(`Fixing: ${s.category}`);
        console.log(`  Old disposition: ${s.disposition} → New disposition: ${targetDisposition}`);
        fixedCount++;
        return { ...s, disposition: targetDisposition };
      }
      return s;
    });
    
    console.log(`\n✓ Fixed ${fixedCount} submissions\n`);
    
    if (fixedCount === 0) {
      console.log('No submissions needed fixing.');
      return;
    }
    
    // Backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backups/fix-disposition-${timestamp}/submissions.json`;
    await put(backupName, JSON.stringify(submissions, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
    console.log(`✓ Backup created: ${backupName}\n`);
    
    // Delete old
    await del(exactBlob.url);
    console.log('✓ Old blob deleted\n');
    
    // Save fixed
    const result = await put(SUBMISSIONS_BLOB, JSON.stringify(fixedSubmissions, null, 2), {
      access: 'public',
      contentType: 'application/json',
    });
    console.log(`✓ Fixed submissions saved: ${result.url}\n`);
    console.log('✅ Fix completed!');
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

fixDispositions();
