import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const PROGRESS_FILE = path.join(DATA_DIR, 'section-progress.json');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Create a timestamped backup of all data files
 */
export function createBackup(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupSubDir = path.join(BACKUP_DIR, timestamp);
  
  fs.mkdirSync(backupSubDir, { recursive: true });
  
  // Copy submissions
  if (fs.existsSync(SUBMISSIONS_FILE)) {
    fs.copyFileSync(
      SUBMISSIONS_FILE,
      path.join(backupSubDir, 'submissions.json')
    );
  }
  
  // Copy progress
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.copyFileSync(
      PROGRESS_FILE,
      path.join(backupSubDir, 'section-progress.json')
    );
  }
  
  return backupSubDir;
}

/**
 * List all available backups
 */
export function listBackups(): string[] {
  if (!fs.existsSync(BACKUP_DIR)) {
    return [];
  }
  
  return fs.readdirSync(BACKUP_DIR)
    .filter(name => fs.statSync(path.join(BACKUP_DIR, name)).isDirectory())
    .sort()
    .reverse();
}

/**
 * Restore from a specific backup
 */
export function restoreBackup(backupName: string): boolean {
  const backupPath = path.join(BACKUP_DIR, backupName);
  
  if (!fs.existsSync(backupPath)) {
    return false;
  }
  
  try {
    // Restore submissions
    const backupSubmissions = path.join(backupPath, 'submissions.json');
    if (fs.existsSync(backupSubmissions)) {
      fs.copyFileSync(backupSubmissions, SUBMISSIONS_FILE);
    }
    
    // Restore progress
    const backupProgress = path.join(backupPath, 'section-progress.json');
    if (fs.existsSync(backupProgress)) {
      fs.copyFileSync(backupProgress, PROGRESS_FILE);
    }
    
    return true;
  } catch (error) {
    console.error('Error restoring backup:', error);
    return false;
  }
}

/**
 * Export all data as a single downloadable JSON file
 */
export function exportAllData(): any {
  const data: any = {
    exportedAt: new Date().toISOString(),
    submissions: [],
    sectionProgress: {},
  };
  
  if (fs.existsSync(SUBMISSIONS_FILE)) {
    data.submissions = JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf-8'));
  }
  
  if (fs.existsSync(PROGRESS_FILE)) {
    data.sectionProgress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  }
  
  return data;
}

/**
 * Import data from a previously exported file
 */
export function importAllData(data: any): boolean {
  try {
    if (data.submissions) {
      fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(data.submissions, null, 2), 'utf-8');
    }
    
    if (data.sectionProgress) {
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data.sectionProgress, null, 2), 'utf-8');
    }
    
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
}
