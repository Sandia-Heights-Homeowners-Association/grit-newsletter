# Migration Guide: In-Memory to File-Based Storage

If you were running the application before this update, follow these steps to migrate smoothly.

## What Happened

The application now uses **persistent file-based storage** instead of in-memory storage.

## Impact

### Before (In-Memory)
- ❌ Data lost on server restart
- ❌ Data lost on deployment
- ❌ No backups

### After (File-Based)
- ✅ Data persists across restarts
- ✅ Data survives deployments
- ✅ Automatic file-based backups
- ✅ Manual export options

## Migration Steps

### If You Have No Previous Data
You're all set! Just start using the application.

### If You Were Testing With Data
Your test data was in memory and is now lost. That's expected. Start fresh with the new persistent storage.

### If You're Deploying to Production

1. **First Deployment**
   - Deploy the updated code
   - The `/data` directory will be created automatically
   - Start accepting submissions

2. **Subsequent Deployments**
   - **Important**: Ensure `/data` directory persists between deployments
   - Most hosting platforms (Vercel, etc.) have ephemeral file systems
   - See "Production Considerations" below

## Production Considerations

### Vercel / Netlify (Serverless)
⚠️ **Warning**: Serverless platforms have read-only file systems in production!

**Options:**
1. Use Vercel Postgres or similar database instead
2. Use Vercel Blob Storage for file persistence
3. Use a traditional server (VPS, EC2, etc.)

### Traditional Servers (VPS, EC2, DigitalOcean)
✅ Perfect! File-based storage works great.

**Ensure**:
- `/data` directory has write permissions
- Regular backups of `/data` directory
- Consider mounting `/data` on a separate volume

### Docker Deployments
Mount `/data` as a volume:
```yaml
volumes:
  - ./data:/app/data
```

## Recommended Hosting for File-Based Storage

### Best Options:
1. **Railway** - Persistent volumes included
2. **Fly.io** - Persistent volumes available
3. **DigitalOcean App Platform** - Can use managed database
4. **Traditional VPS** - Full control

### Not Recommended:
- Vercel (without database)
- Netlify (without database)
- AWS Lambda (without S3)

## Alternative: Use a Database Instead

If you're on a serverless platform, consider using a database:

### Quick Database Options:
1. **Vercel Postgres** (if on Vercel)
2. **Supabase** (PostgreSQL, free tier)
3. **PlanetScale** (MySQL, free tier)
4. **MongoDB Atlas** (NoSQL, free tier)

Would you like me to implement database support instead of file-based storage?

## Testing File Persistence

After deployment, test that data persists:

1. Submit a test entry
2. Verify it appears in the app
3. Restart the server/container
4. Check if the test entry is still there

If it's gone, your platform has ephemeral storage.

## Backup Before Migration

If you had any important data (unlikely since it was in-memory), there's no way to migrate it since it's already gone. Start fresh with the new persistent system.

## Questions?

- Check `/README.md` for full documentation
- See `/FILE-STORAGE-IMPLEMENTATION.md` for technical details
- Review `/DATA-STRUCTURE.md` for data format
