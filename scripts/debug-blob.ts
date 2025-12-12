/**
 * Debug blob access
 */

import { list } from '@vercel/blob';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

async function debugBlob() {
  console.log('Checking blob access...\n');
  console.log('BLOB_READ_WRITE_TOKEN exists:', !!process.env.BLOB_READ_WRITE_TOKEN);
  console.log('Token length:', process.env.BLOB_READ_WRITE_TOKEN?.length || 0);
  console.log();

  try {
    console.log('Listing all blobs...\n');
    const { blobs } = await list();
    
    console.log(`Found ${blobs.length} blobs:\n`);
    
    blobs.forEach(b => {
      console.log(`Path: ${b.pathname}`);
      console.log(`URL: ${b.url}`);
      console.log(`Size: ${b.size} bytes`);
      console.log(`Uploaded: ${new Date(b.uploadedAt).toLocaleString()}`);
      console.log();
    });
    
  } catch (error: any) {
    console.error('Error:', error.message);
    console.error(error);
  }
}

debugBlob();
