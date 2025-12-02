import { put, list } from '@vercel/blob';
import { getAllSubmissions, getAllSectionProgress } from './store';

/**
 * Create a timestamped backup in Vercel Blob
 */
export async function createBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPrefix = `backups/${timestamp}/`;
  
  try {
    const submissions = await getAllSubmissions();
    const sectionProgress = await getAllSectionProgress();
    
    // Save submissions backup
    await put(`${backupPrefix}submissions.json`, JSON.stringify(submissions, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
    
    // Save progress backup
    const progressObj = Object.fromEntries(sectionProgress);
    await put(`${backupPrefix}section-progress.json`, JSON.stringify(progressObj, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });
    
    return backupPrefix;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
}

/**
 * List all available backups
 */
export async function listBackups(): Promise<string[]> {
  try {
    const { blobs } = await list({ prefix: 'backups/' });
    
    // Extract unique backup timestamps
    const backupDirs = new Set<string>();
    blobs.forEach(blob => {
      const match = blob.pathname.match(/^backups\/([^/]+)\//);
      if (match) {
        backupDirs.add(match[1]);
      }
    });
    
    return Array.from(backupDirs).sort().reverse();
  } catch (error) {
    console.error('Error listing backups:', error);
    return [];
  }
}

/**
 * Export all data as a single downloadable JSON file
 */
export async function exportAllData(): Promise<any> {
  const submissions = await getAllSubmissions();
  const sectionProgress = await getAllSectionProgress();
  
  return {
    exportedAt: new Date().toISOString(),
    submissions,
    sectionProgress: Object.fromEntries(sectionProgress),
  };
}

/**
 * Note: Restore and import functions would require updating the main blob files
 * For simplicity, these are not implemented in the blob version
 * You can manually re-upload data via the Vercel dashboard if needed
 */
export function restoreBackup(backupName: string): boolean {
  console.warn('Restore functionality not implemented for Vercel Blob storage');
  return false;
}

export function importAllData(data: any): boolean {
  console.warn('Import functionality not implemented for Vercel Blob storage');
  return false;
}
