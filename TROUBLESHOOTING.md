# Troubleshooting Data Loss Issues

## If Submissions Are Disappearing

### Check Vercel Logs
1. Go to your Vercel project → Deployments
2. Click on the latest deployment → Runtime Logs
3. Look for these log messages:
   - "Loading submissions, found blobs: X [pathnames]"
   - "Loaded submissions: X"
   - "Saving submissions to blob. Count: X"
   - "Successfully saved submissions to blob"

### Common Causes

**Multiple Blob Files**
- Check if there are multiple `submissions.json` files in your blob storage
- Go to Vercel Dashboard → Storage → grit-storage → Browse
- Delete any duplicate or old files (keep only `submissions.json`)

**Race Conditions**
- If multiple people are editing simultaneously, saves might overwrite each other
- Solution: Coordinate editing times or use the backup feature regularly

**Browser Cache**
- Clear your browser cache and do a hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
- This ensures you're seeing the latest data from the server

### Recovery Steps

1. **Check if data is in blob storage:**
   - Go to Vercel Dashboard → Storage → grit-storage
   - Click on `submissions.json` to view contents
   - If data is there but not showing in UI, it's a loading issue
   - If data is missing, you'll need to restore from backup

2. **Restore from backup (if available):**
   - Go to Editor Dashboard → JSON Viewer
   - Click "Export All Data" to download current state
   - If you have a previous export, you can manually upload it to blob storage

3. **Manual blob upload:**
   - Go to Vercel Dashboard → Storage → grit-storage
   - Upload your backup JSON file as `submissions.json`
   - Redeploy or wait for next page load

### Prevention

1. **Regular backups:**
   - Export data weekly: Editor Dashboard → JSON Viewer → Export All Data
   - Save exports to a safe location

2. **Monitor logs:**
   - Check runtime logs after important submissions
   - Verify submission counts match expectations

3. **Single editor at a time:**
   - Coordinate with other editors to avoid simultaneous edits
   - The system uses in-memory cache which can get out of sync

### Emergency Contact

If data is critically lost and no backup exists:
- Check Vercel's blob storage versioning (if enabled)
- Contact Vercel support for blob recovery options
- Re-enter submissions manually as last resort
