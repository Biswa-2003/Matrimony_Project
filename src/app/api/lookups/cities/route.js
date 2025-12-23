import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const stateId = Number(searchParams.get('state_id') || 0);
  if (!stateId) return NextResponse.json([]);
  const { rows } = await query(
    'SELECT id, name FROM cities WHERE state_id = $1 ORDER BY name',
    [stateId]
  );
  return NextResponse.json(rows);
}
