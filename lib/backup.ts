import fs from 'fs';
import path from 'path';
import { getAllSubmissions } from './store';
import { db } from './db';
import { Submission } from './types';

/**
 * Create a timestamped backup as a JSON file in data/backups
 */
export async function createBackup(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'data', 'backups', timestamp);
  
  try {
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const submissions = await getAllSubmissions();
    
    // Save submissions backup
    fs.writeFileSync(
      path.join(backupDir, 'submissions.json'),
      JSON.stringify(submissions, null, 2)
    );
    
    return timestamp;
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
    const backupsDir = path.join(process.cwd(), 'data', 'backups');
    
    if (!fs.existsSync(backupsDir)) {
      return [];
    }
    
    const backupDirs = fs.readdirSync(backupsDir)
      .filter(name => {
        const fullPath = path.join(backupsDir, name);
        return fs.statSync(fullPath).isDirectory();
      })
      .sort()
      .reverse();
    
    return backupDirs;
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
  
  return {
    exportedAt: new Date().toISOString(),
    submissions,
  };
}

/**
 * Restore a backup from a timestamped directory
 */
export async function restoreBackup(backupName: string): Promise<boolean> {
  try {
    const backupDir = path.join(process.cwd(), 'data', 'backups', backupName);
    
    if (!fs.existsSync(backupDir)) {
      console.error('Backup directory not found:', backupDir);
      return false;
    }
    
    const submissionsFile = path.join(backupDir, 'submissions.json');
    
    if (!fs.existsSync(submissionsFile)) {
      console.error('Submissions backup file not found:', submissionsFile);
      return false;
    }
    
    const submissions = JSON.parse(fs.readFileSync(submissionsFile, 'utf-8')) as Submission[];
    
    // Replace all data in database
    await db.replaceAllSubmissions(submissions);
    
    console.log(`Restored ${submissions.length} submissions from backup ${backupName}`);
    return true;
  } catch (error) {
    console.error('Error restoring backup:', error);
    return false;
  }
}

/**
 * Import data from an exported JSON file
 */
export async function importAllData(data: any): Promise<boolean> {
  try {
    if (!data.submissions || !Array.isArray(data.submissions)) {
      console.error('Invalid data format');
      return false;
    }
    
    await db.replaceAllSubmissions(data.submissions);
    
    console.log(`Imported ${data.submissions.length} submissions`);
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}
