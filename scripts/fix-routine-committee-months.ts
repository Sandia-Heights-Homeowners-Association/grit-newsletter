/**
 * Fix routine/committee submission months
 * These should typically be set to the current editing month, not a future month
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

async function fixMonths() {
  console.log('Fixing routine/committee submission months...\n');

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
    
    // Current month is 2025-12
    const currentMonth = '2025-12';
    
    let fixedCount = 0;
    const fixedSubmissions = submissions.map((s: any) => {
      if (routineAndCommittee.includes(s.category) && s.month !== currentMonth) {
        console.log(`Fixing: ${s.category}`);
        console.log(`  Old month: ${s.month} → New month: ${currentMonth}`);
        console.log(`  Disposition: ${s.disposition}`);
        fixedCount++;
        return { ...s, month: currentMonth };
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
    const backupName = `backups/fix-months-${timestamp}/submissions.json`;
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

fixMonths();
