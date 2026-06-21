import { getAllSubmissions } from './store';

/**
 * Export all data as a single downloadable JSON file
 */
export async function exportAllData() {
  const submissions = await getAllSubmissions();
  
  return {
    exportedAt: new Date().toISOString(),
    submissions,
  };
}
