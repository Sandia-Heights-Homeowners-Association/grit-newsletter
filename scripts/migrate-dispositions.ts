/**
 * One-time migration script to update old disposition values to new format
 * 
 * Old format:
 * - 'published' → convert to current month key (e.g., '2025-12')
 * - 'backlogged' → convert to 'backlog'
 * - 'archived' → keep as 'archived'
 * 
 * Run with: npx tsx scripts/migrate-dispositions.ts
 */

import { list, put, del } from '@vercel/blob';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUBMISSIONS_BLOB = 'submissions.json';

async function migrateDispositions() {
  console.log('Starting disposition migration...\n');

  try {
    // Load existing submissions from Vercel Blob
    console.log('1. Loading submissions from Vercel Blob...');
    const { blobs } = await list({ prefix: SUBMISSIONS_BLOB });
    const exactBlob = blobs.find(b => b.pathname === SUBMISSIONS_BLOB);
    
    if (!exactBlob) {
      console.log('❌ No submissions.json found in Vercel Blob');
      return;
    }

    const response = await fetch(exactBlob.url);
    const submissions = await response.json();
    console.log(`✓ Loaded ${submissions.length} submissions\n`);

    // Get current month key for 'published' submissions
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    console.log(`Current month key: ${currentMonthKey}\n`);

    // Analyze current dispositions
    const dispositionCounts: Record<string, number> = {};
    submissions.forEach((s: any) => {
      const disp = s.disposition || 'undefined';
      dispositionCounts[disp] = (dispositionCounts[disp] || 0) + 1;
    });

    console.log('2. Current disposition distribution:');
    Object.entries(dispositionCounts).forEach(([disp, count]) => {
      console.log(`   ${disp}: ${count}`);
    });
    console.log();

    // Perform migration
    console.log('3. Migrating dispositions...');
    let migratedCount = 0;
    
    const migratedSubmissions = submissions.map((s: any) => {
      if (s.disposition === 'published') {
        migratedCount++;
        return { ...s, disposition: currentMonthKey };
      } else if (s.disposition === 'backlogged') {
        migratedCount++;
        return { ...s, disposition: 'backlog' };
      }
      // Keep 'archived', undefined, and month keys as-is
      return s;
    });

    console.log(`✓ Migrated ${migratedCount} submissions\n`);

    // Show new distribution
    const newDispositionCounts: Record<string, number> = {};
    migratedSubmissions.forEach((s: any) => {
      const disp = s.disposition || 'undefined';
      newDispositionCounts[disp] = (newDispositionCounts[disp] || 0) + 1;
    });

    console.log('4. New disposition distribution:');
    Object.entries(newDispositionCounts).forEach(([disp, count]) => {
      console.log(`   ${disp}: ${count}`);
    });
    console.log();

    // Backup old blob
    console.log('5. Creating backup...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backups/migration-${timestamp}/submissions.json`;
    await put(backupName, JSON.stringify(submissions, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
    console.log(`✓ Backup created: ${backupName}\n`);

    // Delete old blob
    console.log('6. Deleting old submissions blob...');
    await del(exactBlob.url);
    console.log('✓ Old blob deleted\n');

    // Save migrated submissions
    console.log('7. Saving migrated submissions...');
    const result = await put(SUBMISSIONS_BLOB, JSON.stringify(migratedSubmissions, null, 2), {
      access: 'public',
      contentType: 'application/json',
    });
    console.log(`✓ Migrated submissions saved: ${result.url}\n`);

    console.log('✅ Migration completed successfully!');
    console.log(`   - ${migratedCount} submissions updated`);
    console.log(`   - Backup available at: ${backupName}`);
    console.log('\nNext steps:');
    console.log('1. Check the editor to verify submissions are visible');
    console.log('2. Delete this script: rm scripts/migrate-dispositions.ts');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run migration
migrateDispositions();
