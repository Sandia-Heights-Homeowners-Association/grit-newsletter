# The GRIT - Newsletter Content Management System

**Guiding Residents, Inspiring Togetherness**

A comprehensive Next.js application for collecting and managing content for the Sandia Heights Homeowners Association Newsletter.

## Features

### Public Dashboard
- View submission statistics and newsletter progress
- Submit community contributions (no password required)
- See submission deadlines and guidelines
- Access to protected pages for routine and committee content

### Community Submission Categories
Anyone can submit content in these categories:
- Classifieds
- Lost & Found
- On My Mind
- Response to Prior Content
- Local Event Announcement
- Kids' Corner
- DIY & Crafts
- Rants & Raves
- Neighbor Appreciation
- Wildlife
- Photos

### Routine Content Submissions (Password Protected)
- President's Note
- Board Notes
- Office Notes
- ACC Activity Log (copy/paste from Excel)
- CSC Table (CSV format)
- Security Report (Excel/CSV)

**Password:** `routine2025`

### Committee Content Submissions (Password Protected)
- Architectural Control Committee (ACC)
- Covenant Support Committee (CSC)
- Communications & Publications Committee
- Community Service & Membership Committee
- Environment & Safety Committee
- Executive Committee
- Finance Committee
- Governance Committee
- Nominating Committee

**Password:** `committee2025`

### Editor Dashboard (Password Protected)
**Password:** `grit2025`

Editors can:
- View all submissions organized by category
- Set disposition for each submission (Published, Backlogged, or Archived)
- See concatenated content for each section
- Edit combined text directly in the dashboard
- Access backlogged content from previous months
- Mark sections as complete
- Export the entire newsletter as a .txt file

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build for Production

```bash
npm run build
npm start
```

## Usage

### For Community Members
1. Visit the main dashboard
2. Click on any community contribution category
3. Fill out the form with your name, email, and content
4. Submit

### For Routine Content Contributors
1. Click "Routine Content" on the dashboard
2. Enter password: `routine2025`
3. Select category from dropdown
4. Paste your content (can copy directly from Excel for ACC Activity Log and Security Report)
5. Submit

### For Committee Chairs
1. Click "Committee Content" on the dashboard
2. Enter password: `committee2025`
3. Select your committee from dropdown
4. Enter your report
5. Submit

### For Editors
1. Click "Editor Dashboard" on the main page
2. Enter password: `grit2025`
3. **Select Month**: Use the prominent month selector at the top to choose which newsletter issue to edit
   - Defaults to the current collection month (based on deadline)
   - Can switch between past, current, and future months
   - Useful for handling late submissions near deadline boundaries
4. **Settings**: Click the ⚙️ Settings button to:
   - Change the submission deadline day (1-28 of month)
   - View current deadline and target publication month
5. Select a section from the left sidebar to edit
6. For each submission:
   - Set disposition (Published, Backlogged, or Archived)
   - Only "Published" submissions appear in the concatenated content
7. Edit the combined text in the main editor
8. Access backlogged content from previous months if needed
9. Click "Save Progress" to save changes
10. Click "Mark as Complete" when section is finalized
11. Use "Export Newsletter" button to download the complete newsletter as a .txt file

## Data Storage

**File-Based JSON Storage** - All data is stored in human-readable JSON files in the `/data` directory:

- `data/submissions.json` - All newsletter submissions (master log)
  - `month`: Immutable, records which collection period submission was originally for
  - `disposition`: Mutable, current status (assigned month, backlog, archived, or unreviewed)
- `data/backups/` - Automatic timestamped backups

### Data Persistence

Data persists across server restarts and deployments. The JSON files are:
- **Human-readable** - Open in any text editor
- **Portable** - Easy to backup, transfer, or archive
- **Git-friendly** - Can optionally commit to version control (currently gitignored)

### Backup & Export Features

Editors can:
1. **Create Backup** - Timestamped snapshot of all data
2. **Export All Data** - Download complete dataset as JSON
3. **Export Newsletter** - Download formatted newsletter as text file

### Data Location

```
data/
├── submissions.json          # All submissions (master log)
└── backups/                  # Timestamped backups
    ├── 2025-11-27T10-30-00/
    │   └── submissions.json
    └── 2025-12-01T15-45-00/
        └── submissions.json
```


### Month-to-Month Handling

Each submission is tagged with its target publication month:
- Submissions made in November are for the December issue
- Data from all months is retained indefinitely
- Backlogged items from previous months remain accessible
- Editors can filter by month when needed

### Manual Backup

You can manually backup data by copying the `/data` directory:

```bash
cp -r data data-backup-$(date +%Y-%m-%d)
```

### Committing Data to Git (Optional)

By default, `/data/*.json` is gitignored. To commit your data:

1. Remove the gitignore entry for data files
2. Commit the data directory to your repository
3. Data will be versioned with your code

## Customization

### Changing Passwords
Edit the passwords in `lib/constants.ts`:
```typescript
export const EDITOR_PASSWORD = 'your-editor-password';
export const ROUTINE_PASSWORD = 'your-routine-password';
export const COMMITTEE_PASSWORD = 'your-committee-password';
```

### Modifying Categories
Edit the category lists in `lib/types.ts`:
```typescript
export const COMMUNITY_CATEGORIES = [...];
export const ROUTINE_CATEGORIES = [...];
export const COMMITTEE_CATEGORIES = [...];
```

### Changing Submission Deadline
**Recommended Method:** Use the Settings panel in the Editor Dashboard:
1. Click "Editor Dashboard" and log in
2. Click the ⚙️ Settings button
3. Enter a new deadline day (1-28)
4. Click "Update Deadline"

The deadline setting is stored in Vercel Blob and persists across deployments.

**Alternative Method:** Edit `SUBMISSION_DEADLINE_DAY` in `lib/constants.ts`:
```typescript
export const SUBMISSION_DEADLINE_DAY = 10; // Day of the month
```
Note: This requires redeployment and will be overridden by the Settings panel value if one exists.

## File Structure

```
app/
├── page.tsx                    # Main public dashboard
├── layout.tsx                  # App layout and metadata
├── submit/[category]/page.tsx  # Community submission form
├── routine/page.tsx            # Routine content submission
├── committee/page.tsx          # Committee content submission
├── editor/page.tsx             # Editor dashboard
└── api/
    ├── submit/route.ts         # Submission API
    ├── stats/route.ts          # Statistics API
    └── editor/route.ts         # Editor API
lib/
├── types.ts                    # TypeScript types and categories
├── constants.ts                # App constants and helpers
└── store.ts                    # Data storage functions
```

## Technologies Used

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React 19** - UI library

## Future Enhancements

Consider implementing:
- Database integration (PostgreSQL, Supabase, etc.)
- Proper authentication with NextAuth.js
- Email notifications for new submissions
- Rich text editor for better formatting
- Image upload support for Photos category
- Search and filter functionality
- Multi-month archive view
- PDF export instead of just .txt
- Submission editing/deletion capabilities
- User roles and permissions system

## License

This project is proprietary to Sandia Heights Homeowners Association.

