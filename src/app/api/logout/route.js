import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.json({ success: true, message: 'Logged out' });

  // Clear the token cookie
  response.cookies.set('token', '', {
    httpOnly: true,
    path: '/',
    expires: new Date(0), // Expire now
  });

  return response;
}

// ✅ Add POST method support (frontend calls with POST)
export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out' });

  // Clear all possible auth cookies
  response.cookies.set('token', '', {
    httpOnly: true,
    path: '/',
    expires: new Date(0),
  });

  response.cookies.set('auth_token', '', {
    httpOnly: true,
    path: '/',
    expires: new Date(0),
  });

  response.cookies.set('auth', '', {
    httpOnly: true,
    path: '/',
    expires: new Date(0),
  });

  return response;
}
