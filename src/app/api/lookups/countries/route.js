import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const { rows } = await query('SELECT id, name FROM countries ORDER BY name');
  return NextResponse.json(rows);
}
