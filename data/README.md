# GRIT Newsletter Data Directory

This directory contains all newsletter submission data and backups.

## Files

- **submissions.json** - All newsletter submissions with metadata
  - `month`: Immutable field showing which collection period the submission was originally for
  - `disposition`: Mutable field showing current status (month assignment, backlog, archived, or undefined for unreviewed)
- **backups/** - Timestamped backups created by editors

## Initial State

The JSON file starts empty:
- `submissions.json`: `[]`

Data will be automatically created and updated as submissions come in and editors work.

## Backups

Use the Editor Dashboard to:
- Create manual backups (timestamped snapshots)
- Export all data as downloadable JSON
- Export completed newsletter as text file

## Manual Management

You can manually edit these JSON files if needed, but be careful to maintain valid JSON syntax.

See `/DATA-STRUCTURE.md` in the project root for complete documentation of the data format.

## Git Ignore

By default, the JSON data files are gitignored. To commit your data to version control, remove the `/data/*.json` line from `.gitignore`.
