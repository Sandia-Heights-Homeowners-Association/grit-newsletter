# Data Structure Documentation

## File Structure

All application data is stored in JSON format in the `/data` directory.

## submissions.json

Array of submission objects:

```json
[
  {
    "id": "1732723456789-abc123def",
    "category": "On My Mind",
    "content": "Submitted by: John Doe (john@example.com)\n\nI love our community and the beautiful sunsets we get in Sandia Heights!",
    "submittedAt": "2025-11-27T18:30:45.123Z",
    "disposition": "published",
    "month": "2025-12"
  },
  {
    "id": "1732724567890-xyz789ghi",
    "category": "President's Note",
    "content": "Dear Residents,\n\nThis month we've seen great progress on our community initiatives...",
    "submittedAt": "2025-11-28T09:15:22.456Z",
    "disposition": "published",
    "month": "2025-12"
  }
]
```

### Field Descriptions

- **id**: Unique identifier (timestamp + random string)
- **category**: One of the predefined submission categories
- **content**: The actual submission text
- **submittedAt**: ISO 8601 timestamp of submission
- **disposition**: One of `"published"`, `"backlogged"`, or `"archived"`
- **month**: Target publication month in YYYY-MM format

### Disposition Status

- **published**: Will appear in the newsletter
- **backlogged**: Saved for future use
- **archived**: Not currently used (removed from publication)

## section-progress.json

Object mapping months to section progress arrays:

```json
{
  "2025-12": [
    {
      "category": "President's Note",
      "isComplete": true,
      "editedContent": "Dear Residents,\n\nAs we approach the holidays..."
    },
    {
      "category": "On My Mind",
      "isComplete": false
    },
    {
      "category": "Classifieds",
      "isComplete": false
    }
  ],
  "2026-01": [
    {
      "category": "President's Note",
      "isComplete": false
    }
  ]
}
```

### Field Descriptions

- **category**: Section/category name
- **isComplete**: Whether editors marked this section as finalized
- **editedContent**: (Optional) Editor's final version of concatenated submissions

## Backups

Backups are stored in timestamped subdirectories:

```
data/backups/
└── 2025-11-27T14-30-00-000Z/
    ├── submissions.json
    └── section-progress.json
```

Each backup is a complete snapshot of the data at that moment.

## Month Format

Months are stored as `YYYY-MM`:
- `2025-11` = November 2025 submissions (for December 2025 issue)
- `2025-12` = December 2025 submissions (for January 2026 issue)

The application automatically calculates the next month's publication.

## Importing/Exporting

### Export All Data

Downloads a single JSON file:

```json
{
  "exportedAt": "2025-11-27T20:15:30.000Z",
  "submissions": [ /* all submissions */ ],
  "sectionProgress": { /* all progress data */ }
}
```

### Import Data

Upload the same format to restore or transfer data between systems.

## Data Maintenance

### Cleaning Old Data

To remove old submissions (e.g., from 2+ years ago):

1. Open `data/submissions.json`
2. Filter out old entries
3. Save the file
4. Or use a script:

```javascript
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/submissions.json', 'utf-8'));
const cutoffDate = new Date('2024-01-01');
const filtered = data.filter(s => new Date(s.submittedAt) > cutoffDate);
fs.writeFileSync('data/submissions.json', JSON.stringify(filtered, null, 2));
```

### Archiving Old Months

To archive completed newsletters:

1. Create backup: `data/backups/archive-2025/`
2. Copy relevant month's data
3. Optionally remove from main files

## File Size Considerations

With typical newsletter content:
- ~50 submissions/month = ~50KB JSON
- 12 months = ~600KB
- Very manageable for file-based storage

Expect files under 1MB even after several years of use.
