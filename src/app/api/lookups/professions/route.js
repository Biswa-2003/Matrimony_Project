import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await query('SELECT id, name FROM professions ORDER BY name');
    return NextResponse.json(rows, { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' } });
  } catch (e) {
    console.error('[lookups/professions]', e.message);
    return NextResponse.json([], { status: 200 });
  }
}
