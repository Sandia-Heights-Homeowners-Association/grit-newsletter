# Vercel Blob Storage Migration Guide

## What Changed

Your GRIT newsletter app now uses **Vercel Blob Storage** instead of local file system storage. This means your data will persist properly on Vercel's serverless platform.

## Steps to Complete Migration

### 1. Enable Vercel Blob Storage (Do this first!)

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your `grit-newsletter` project
3. Go to the **Storage** tab
4. Click **Create Database** → **Blob**
5. Click **Create** and follow the prompts
6. Vercel will automatically add the `BLOB_READ_WRITE_TOKEN` environment variable

### 2. Deploy the Updated Code

```bash
git add .
git commit -m "Migrate to Vercel Blob storage"
git push
```

Vercel will automatically deploy the changes.

### 3. Migrate Existing Data (If you have data)

If you have existing submissions from before this migration:

**Option A: Re-enter manually** (recommended if you only have a few submissions)
- Just re-submit the content through the website

**Option B: Use the export/import** (if you have local backups)
1. If you have a backup file from "Export All Data", keep it safe
2. After the new deployment is live, you can manually upload your JSON files to Blob storage via Vercel dashboard

### 4. Test the Migration

1. Visit your deployed site
2. Submit a test entry
3. Wait a few minutes, then refresh the page
4. Check if your test entry is still there (it should be!)
5. Make another submission to verify persistence

## How Vercel Blob Works

- **Persistent**: Data survives deployments and restarts
- **Fast**: Low latency reads/writes
- **Scalable**: Handles growth automatically
- **Backed up**: Vercel handles redundancy

## Data Structure

Your data is now stored as:
- `submissions.json` - All newsletter submissions
- `section-progress.json` - Editor progress
- `backups/[timestamp]/` - Timestamped backups

## Pricing

Vercel Blob is included in the Pro plan:
- **Free tier**: Up to 500MB storage, 100k reads/month
- Your newsletter data will likely stay under 1MB total
- **You're well within the free tier limits**

## Troubleshooting

### "Blob storage not configured" error
- Make sure you've enabled Blob Storage in your Vercel project settings
- Check that `BLOB_READ_WRITE_TOKEN` is set in environment variables

### Data not persisting
- Verify Blob Storage is enabled in Vercel dashboard
- Check the deployment logs for errors
- Make sure you're testing on the deployed Vercel URL, not localhost

### Local development
For local testing with Blob:
1. Go to your Vercel project → Storage → Blob
2. Copy the `.env.local` settings Vercel provides
3. Create a `.env.local` file in your project root
4. Paste the blob credentials

## Backup Strategy

The app still supports backups:
- **Create Backup** - Creates timestamped snapshots in Blob
- **Export All Data** - Downloads complete JSON dataset
- Backups are stored in Blob at `backups/[timestamp]/`

## Need Help?

If something goes wrong:
1. Check Vercel deployment logs
2. Verify Blob Storage is enabled
3. Export your data before troubleshooting
4. Contact Vercel support if needed

## Rollback Plan

If you need to go back to file-based storage:
1. Export all data first
2. Revert this commit: `git revert HEAD`
3. Push to trigger new deployment
4. Re-import your data

---

**Questions?** Check the Vercel Blob documentation:
https://vercel.com/docs/storage/vercel-blob
