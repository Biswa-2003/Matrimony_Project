import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { revokeSession } from '@/lib/sessions';

/** End this device's session server-side too, so a copied cookie stops working. */
async function endCurrentSession() {
  try {
    const token = (await cookies()).get('token')?.value;
    if (!token) return;
    const p = jwt.verify(token, process.env.JWT_SECRET);
    if (p?.jti && p?.id) await revokeSession(p.id, p.jti);
  } catch { /* expired / invalid token — nothing to revoke */ }
}

function cleared() {
  const response = NextResponse.json({ success: true, message: 'Logged out' });
  for (const name of ['token', 'auth_token', 'auth']) {
    response.cookies.set(name, '', { httpOnly: true, path: '/', expires: new Date(0) });
  }
  return response;
}

export async function GET() {
  await endCurrentSession();
  return cleared();
}

// the app calls POST
export async function POST() {
  await endCurrentSession();
  return cleared();
}
