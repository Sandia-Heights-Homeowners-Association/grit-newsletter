#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '.env.local'), quiet: true });

const args = process.argv.slice(2);
const command = args[0] || 'summary';

function option(name, fallback) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

function usage() {
  console.log(`
Usage:
  npm run db:view
  npm run db:view -- submissions --limit 25 --status backlog
  npm run db:view -- submissions --month 2026-07 --search wildlife
  npm run db:view -- submission <id>
  npm run db:view -- captions
  npm run db:view -- schema

Filters for "submissions":
  --limit <n>           Number of rows to show. Default: 25.
  --status <value>      unreviewed, backlog, archived, accepted, or a YYYY-MM disposition.
  --month <YYYY-MM>     Original collection month.
  --category <text>     Case-insensitive category substring.
  --search <text>       Case-insensitive search across content, title, names, email, category.
  --json                Print JSON instead of console.table.
`);
}

if (hasFlag('help') || command === 'help') {
  usage();
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env.local or the current environment.');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toISOString();
}

function statusOf(row) {
  return row.disposition || 'unreviewed';
}

function matchesStatus(row, status) {
  if (!status) return true;
  if (status === 'unreviewed') return !row.disposition;
  if (status === 'accepted') return Boolean(row.disposition && row.disposition !== 'backlog' && row.disposition !== 'archived');
  return row.disposition === status;
}

function textIncludes(value, needle) {
  return String(value || '').toLowerCase().includes(needle);
}

function print(rows) {
  if (hasFlag('json')) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    console.table(rows);
  }
}

async function summary() {
  const [submissions, byCategory, byDisposition, captions] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM submissions`,
    sql`
      SELECT category, COUNT(*)::int AS count
      FROM submissions
      GROUP BY category
      ORDER BY count DESC, category ASC
    `,
    sql`
      SELECT COALESCE(disposition, 'unreviewed') AS disposition, COUNT(*)::int AS count
      FROM submissions
      GROUP BY COALESCE(disposition, 'unreviewed')
      ORDER BY count DESC, disposition ASC
    `,
    sql`SELECT COUNT(*)::int AS count FROM captions`,
  ]);

  console.log('Summary');
  print([
    { table: 'submissions', count: submissions[0]?.count ?? 0 },
    { table: 'captions', count: captions[0]?.count ?? 0 },
  ]);
  console.log('\nBy category');
  print(byCategory);
  console.log('\nBy disposition');
  print(byDisposition);
}

async function submissions() {
  const limit = Math.max(1, Math.min(Number(option('limit', 25)) || 25, 500));
  const status = option('status');
  const month = option('month');
  const category = option('category');
  const search = option('search');
  const searchNeedle = search ? String(search).toLowerCase() : '';
  const categoryNeedle = category ? String(category).toLowerCase() : '';

  const rows = await sql`
    SELECT *
    FROM submissions
    ORDER BY submitted_at DESC
    LIMIT ${Math.max(limit * 4, limit)}
  `;

  const filtered = rows
    .filter(row => matchesStatus(row, status))
    .filter(row => !month || row.month === month)
    .filter(row => !categoryNeedle || textIncludes(row.category, categoryNeedle))
    .filter(row => {
      if (!searchNeedle) return true;
      return [
        row.id,
        row.category,
        row.title,
        row.published_name,
        row.contact_name,
        row.contact_email,
        row.location,
        row.content,
      ].some(value => textIncludes(value, searchNeedle));
    })
    .slice(0, limit)
    .map(row => ({
      id: row.id,
      submitted: formatDate(row.submitted_at),
      category: row.category,
      status: statusOf(row),
      month: row.month,
      item_type: row.item_type || 'submission',
      priority: row.priority || 'normal',
      title: row.title || '',
      published_name: row.published_name || '',
      contact_name: row.contact_name || '',
      contact_email: row.contact_email || '',
      preview: String(row.content || '').replace(/\s+/g, ' ').slice(0, 120),
    }));

  print(filtered);
}

async function submission() {
  const id = args[1];
  if (!id) {
    console.error('Missing submission id.');
    usage();
    process.exit(1);
  }

  const rows = await sql`SELECT * FROM submissions WHERE id = ${id}`;
  if (rows.length === 0) {
    console.error(`No submission found for id: ${id}`);
    process.exit(1);
  }
  console.log(JSON.stringify(rows[0], null, 2));
}

async function captions() {
  const limit = Math.max(1, Math.min(Number(option('limit', 25)) || 25, 500));
  const rows = await sql`
    SELECT id, published_name, full_name, email, location, caption, submitted_at
    FROM captions
    ORDER BY submitted_at DESC
    LIMIT ${limit}
  `;
  print(rows.map(row => ({ ...row, submitted_at: formatDate(row.submitted_at) })));
}

async function schema() {
  const table = option('table');
  const rows = await sql`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;
  print(rows.filter(row => !table || row.table_name === table));
}

const commands = { summary, submissions, submission, captions, schema };

if (!commands[command]) {
  console.error(`Unknown command: ${command}`);
  usage();
  process.exit(1);
}

await commands[command]();
