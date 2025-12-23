import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const countryId = Number(searchParams.get('country_id') || 0);
  if (!countryId) return NextResponse.json([]);
  const { rows } = await query(
    'SELECT id, name FROM states WHERE country_id = $1 ORDER BY name',
    [countryId]
  );
  return NextResponse.json(rows);
}
