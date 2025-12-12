/**
 * Restore submissions from the most recent backup
 */

import { list, put } from '@vercel/blob';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUBMISSIONS_BLOB = 'submissions.json';

async function restoreFromBackup() {
  console.log('Looking for most recent backup...\n');

  try {
    const { blobs } = await list({ prefix: 'backups/' });
    
    if (blobs.length === 0) {
      console.log('❌ No backups found');
      return;
    }
    
    // Sort by upload time (most recent first)
    const sortedBackups = blobs
      .filter(b => b.pathname.endsWith('submissions.json'))
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    
    console.log('Available backups:');
    sortedBackups.slice(0, 5).forEach((b, i) => {
      console.log(`${i + 1}. ${b.pathname} (${new Date(b.uploadedAt).toLocaleString()})`);
    });
    console.log();
    
    const mostRecent = sortedBackups[0];
    console.log(`Restoring from: ${mostRecent.pathname}\n`);
    
    const response = await fetch(mostRecent.url);
    const backupData = await response.json();
    
    console.log(`Backup contains ${backupData.length} submissions\n`);
    
    // Show what's in the backup
    const byCategory: Record<string, number> = {};
    backupData.forEach((s: any) => {
      byCategory[s.category] = (byCategory[s.category] || 0) + 1;
    });
    
    console.log('Submissions by category:');
    Object.entries(byCategory).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });
    console.log();
    
    // Restore
    const result = await put(SUBMISSIONS_BLOB, JSON.stringify(backupData, null, 2), {
      access: 'public',
      contentType: 'application/json',
    });
    
    console.log(`✅ Restored to: ${result.url}`);
    
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error(error);
  }
}

restoreFromBackup();
