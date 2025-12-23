import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const relId = Number(searchParams.get('religion_id') || 0);

  let sql = 'SELECT id, name FROM castes';
  const params = [];
  if (relId) { sql += ' WHERE religion_id = $1'; params.push(relId); }
  sql += ' ORDER BY name';

  const { rows } = await query(sql, params);
  return NextResponse.json(rows);
}
