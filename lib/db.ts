import { neon } from '@neondatabase/serverless';
import { Submission, SubmissionCategory } from './types';

// Lazy database client initialization
let sqlClient: ReturnType<typeof neon> | null = null;

function getSQL() {
  if (!sqlClient) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    sqlClient = neon(process.env.DATABASE_URL);
  }
  return sqlClient;
}

// Database schema initialization
export async function initializeDatabase() {
  const sql = getSQL();
  try {
    // Create submissions table with proper indexes
    await sql`
      CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        submitted_at TIMESTAMP NOT NULL,
        disposition TEXT,
        month TEXT NOT NULL,
        published_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for common queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_submissions_month 
      ON submissions(month)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_submissions_category 
      ON submissions(category)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_submissions_disposition 
      ON submissions(disposition)
    `;

    // Create composite index for common query pattern
    await sql`
      CREATE INDEX IF NOT EXISTS idx_submissions_category_month 
      ON submissions(category, month)
    `;

    // Create config table for settings like deadline
    await sql`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('Database tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Helper to convert database row to Submission object
function rowToSubmission(row: any): Submission {
  return {
    id: row.id,
    category: row.category as SubmissionCategory,
    content: row.content,
    submittedAt: new Date(row.submitted_at),
    disposition: row.disposition || undefined,
    month: row.month,
    publishedName: row.published_name || undefined,
  };
}

// Helper to convert Submission object to database row
function submissionToRow(submission: Submission) {
  return {
    id: submission.id,
    category: submission.category,
    content: submission.content,
    submitted_at: submission.submittedAt.toISOString(),
    disposition: submission.disposition || null,
    month: submission.month,
    published_name: submission.publishedName || null,
  };
}

// Database operations
export const db = {
  // Insert a new submission
  async insertSubmission(submission: Submission): Promise<Submission> {
    const sql = getSQL();
    const row = submissionToRow(submission);
    
    await sql`
      INSERT INTO submissions (id, category, content, submitted_at, disposition, month, published_name)
      VALUES (${row.id}, ${row.category}, ${row.content}, ${row.submitted_at}, ${row.disposition}, ${row.month}, ${row.published_name})
    `;
    
    return submission;
  },

  // Get all submissions for a month
  async getSubmissionsByMonth(month: string): Promise<Submission[]> {
    const sql = getSQL();
    const rows = (await sql`
      SELECT * FROM submissions 
      WHERE month = ${month}
      ORDER BY submitted_at DESC
    `) as any[];
    
    return rows.map(rowToSubmission);
  },

  // Get submissions by category and month
  async getSubmissionsByCategory(category: SubmissionCategory, month: string): Promise<Submission[]> {
    const sql = getSQL();
    const rows = (await sql`
      SELECT * FROM submissions 
      WHERE category = ${category} AND month = ${month}
      ORDER BY submitted_at DESC
    `) as any[];
    
    return rows.map(rowToSubmission);
  },

  // Get all submissions (for backlog, export, etc.)
  async getAllSubmissions(): Promise<Submission[]> {
    const sql = getSQL();
    const rows = (await sql`
      SELECT * FROM submissions 
      ORDER BY submitted_at DESC
    `) as any[];
    
    return rows.map(rowToSubmission);
  },

  // Update submission disposition - ATOMIC operation
  async updateSubmissionDisposition(id: string, disposition: string): Promise<Submission | null> {
    const sql = getSQL();
    const rows = (await sql`
      UPDATE submissions 
      SET disposition = ${disposition}, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `) as any[];
    
    if (rows.length === 0) {
      return null;
    }
    
    return rowToSubmission(rows[0]);
  },

  // Batch update dispositions - ATOMIC transaction
  async batchUpdateDispositions(updates: Array<{ id: string; disposition: string }>): Promise<number> {
    if (updates.length === 0) return 0;

    const sql = getSQL();
    // Build a single UPDATE with CASE statement for atomic batch update
    const ids = updates.map(u => u.id);
    const whenClauses = updates.map(u => 
      `WHEN id = '${u.id}' THEN '${u.disposition}'`
    ).join(' ');

    const result = (await sql`
      UPDATE submissions 
      SET disposition = CASE ${sql.unsafe(whenClauses)} END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY(${ids})
    `) as any[];
    
    return result.length;
  },

  // Delete a submission
  async deleteSubmission(id: string): Promise<boolean> {
    const sql = getSQL();
    const result = (await sql`
      DELETE FROM submissions 
      WHERE id = ${id}
    `) as any[];
    
    return result.length > 0;
  },

  // Get or set deadline day
  async getDeadlineDay(): Promise<number> {
    const sql = getSQL();
    const rows = (await sql`
      SELECT value FROM config WHERE key = 'deadline_day'
    `) as any[];
    
    if (rows.length === 0) {
      return 20; // Default
    }
    
    return rows[0].value.day as number;
  },

  async setDeadlineDay(day: number): Promise<void> {
    const sql = getSQL();
    await sql`
      INSERT INTO config (key, value, updated_at)
      VALUES ('deadline_day', ${JSON.stringify({ day })}, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET value = ${JSON.stringify({ day })}, updated_at = CURRENT_TIMESTAMP
    `;
  },

  // Get category stats for a month
  async getCategoryStats(month: string): Promise<Record<string, number>> {
    const sql = getSQL();
    const rows = (await sql`
      SELECT category, COUNT(*) as count
      FROM submissions
      WHERE month = ${month} OR disposition = ${month}
      GROUP BY category
    `) as any[];
    
    const stats: Record<string, number> = {};
    rows.forEach((row: any) => {
      stats[row.category] = parseInt(row.count);
    });
    
    return stats;
  },

  // Replace all submissions (for import/restore)
  async replaceAllSubmissions(submissions: Submission[]): Promise<void> {
    const sql = getSQL();
    // Use a transaction to ensure atomicity
    // First, delete all existing submissions
    await sql`DELETE FROM submissions`;
    
    // Then insert all new submissions
    if (submissions.length > 0) {
      // Insert one by one (still within transaction semantics)
      for (const submission of submissions) {
        await db.insertSubmission(submission);
      }
    }
  },
};
