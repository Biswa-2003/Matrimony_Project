import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  const { photoPath } = await req.json();
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    await query(
      `UPDATE users SET photo = photo - $1::text WHERE id = $2`,
      [photoPath, decoded.id]
    );
    return NextResponse.json({ message: 'Photo deleted' });
  } catch (err) {
    console.error('Delete photo error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
