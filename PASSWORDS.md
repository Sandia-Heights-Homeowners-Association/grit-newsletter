# Password Reference

## Application Passwords

Keep this file secure and do not commit to version control!

### Editor Dashboard
- **URL:** `/editor`
- **Password:** `grit2025`
- **Purpose:** Full editorial control, manage all submissions, export newsletter

### Routine Content Submission
- **URL:** `/routine`
- **Password:** `routine2025`
- **Purpose:** Submit President's Note, Board Notes, Office Notes, ACC Activity Log, CSC Table, Security Report

### Committee Content Submission
- **URL:** `/committee`
- **Password:** `committee2025`
- **Purpose:** Submit committee reports from all committees

## Changing Passwords

To change passwords, edit `/lib/constants.ts`:

```typescript
export const EDITOR_PASSWORD = 'grit2025';
export const ROUTINE_PASSWORD = 'routine2025';
export const COMMITTEE_PASSWORD = 'committee2025';
```

## Security Notes

⚠️ **Important:** These are simple password protections suitable for internal use only. For production:

1. Implement proper authentication (NextAuth.js, Clerk, Auth0, etc.)
2. Use environment variables for sensitive data
3. Add rate limiting to prevent brute force attacks
4. Consider role-based access control (RBAC)
5. Use HTTPS in production
6. Store passwords securely hashed in a database

## Production Recommendations

When deploying to production:

1. Move passwords to environment variables:
   ```bash
   EDITOR_PASSWORD=your-secure-password
   ROUTINE_PASSWORD=your-secure-password
   COMMITTEE_PASSWORD=your-secure-password
   ```

2. Update `lib/constants.ts`:
   ```typescript
   export const EDITOR_PASSWORD = process.env.EDITOR_PASSWORD || 'default';
   export const ROUTINE_PASSWORD = process.env.ROUTINE_PASSWORD || 'default';
   export const COMMITTEE_PASSWORD = process.env.COMMITTEE_PASSWORD || 'default';
   ```

3. Add `.env.local` to `.gitignore` (already done by Next.js)

4. Set environment variables in your hosting platform (Vercel, Netlify, etc.)
