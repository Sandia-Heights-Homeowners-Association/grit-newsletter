import { NextRequest, NextResponse } from 'next/server';
import { EDITOR_PASSWORD } from '@/lib/constants';
import { createBackup, listBackups, restoreBackup, exportAllData, importAllData } from '@/lib/backup';

// Verify editor password
function verifyPassword(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  
  const password = authHeader.replace('Bearer ', '');
  return password === EDITOR_PASSWORD;
}

// GET - List backups or export all data
export async function GET(request: NextRequest) {
  if (!verifyPassword(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'list') {
      const backups = await listBackups();
      return NextResponse.json({ backups });
    } else if (action === 'export') {
      const data = await exportAllData();
      return NextResponse.json(data);
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Backup GET error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// POST - Create backup, restore, or import data
export async function POST(request: NextRequest) {
  if (!verifyPassword(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'create':
        const backupPath = await createBackup();
        return NextResponse.json({ 
          success: true, 
          backupPath,
          message: 'Backup created successfully' 
        });

      case 'restore':
        const { backupName } = data;
        const restored = restoreBackup(backupName);
        if (restored) {
          return NextResponse.json({ 
            success: true,
            message: 'Backup restored successfully' 
          });
        } else {
          return NextResponse.json(
            { error: 'Failed to restore backup (not implemented for Vercel Blob)' },
            { status: 400 }
          );
        }

      case 'import':
        const { importData } = data;
        const imported = importAllData(importData);
        if (imported) {
          return NextResponse.json({ 
            success: true,
            message: 'Data imported successfully' 
          });
        } else {
          return NextResponse.json(
            { error: 'Failed to import data (not implemented for Vercel Blob)' },
            { status: 400 }
          );
        }

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Backup POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
