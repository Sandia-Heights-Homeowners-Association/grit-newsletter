/**
 * Check current submissions using proper blob access
 */

import { list, head } from '@vercel/blob';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function checkCurrentData() {
  console.log('Checking current submissions data...\n');

  try {
    // Get the submissions blob info
    const { blobs } = await list({ prefix: 'submissions.json' });
    const submissionsBlob = blobs.find(b => b.pathname === 'submissions.json');
    
    if (!submissionsBlob) {
      console.log('❌ No submissions.json found');
      
      // Check if we have local data files
      console.log('\nChecking local data files...');
      try {
        const localData = readFileSync('./data/submissions.json', 'utf-8');
        const submissions = JSON.parse(localData);
        console.log(`✓ Found local data with ${submissions.length} submissions`);
        
        const byCategory: Record<string, number> = {};
        submissions.forEach((s: any) => {
          byCategory[s.category] = (byCategory[s.category] || 0) + 1;
        });
        
        console.log('\nSubmissions by category:');
        Object.entries(byCategory).forEach(([cat, count]) => {
          console.log(`  ${cat}: ${count}`);
        });
        
      } catch (err) {
        console.log('No local data file found either');
      }
      return;
    }
    
    console.log(`Found submissions.json:`);
    console.log(`  Size: ${submissionsBlob.size} bytes`);
    console.log(`  Uploaded: ${new Date(submissionsBlob.uploadedAt).toLocaleString()}`);
    console.log(`  URL: ${submissionsBlob.url}`);
    console.log('\nThis blob exists and appears to have data.');
    console.log('The issue may be with how the app is reading it.');
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

checkCurrentData();
