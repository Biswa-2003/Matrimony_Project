import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { query } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Stores every enquiry in contact_messages (visible in Admin → Reports & Enquiries)
 * and, when SMTP is configured, also emails it to the support inbox.
 */
export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(`contact:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many messages. Please try again later.' }, { status: 429 });
  }

  try {
    const { name, email, mobile, subject, message } = await req.json();

    if (!name || !email || !mobile || !message) {
      return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(String(email))) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    await ensureSchema();
    await query(
      `INSERT INTO contact_messages (name, email, mobile, subject, message) VALUES ($1, $2, $3, $4, $5)`,
      [String(name).slice(0, 120), String(email).slice(0, 200), String(mobile).slice(0, 30), String(subject || '').slice(0, 200), String(message).slice(0, 5000)]
    );

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: process.env.SUPPORT_EMAIL || process.env.EMAIL_USER,
          replyTo: email,
          subject: `[MatriMoney enquiry] ${subject || 'New message'} — ${name}`,
          html: `<p><b>${escapeHtml(name)}</b> (${escapeHtml(email)}, ${escapeHtml(mobile)}) wrote:</p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
        });
      } catch (mailErr) {
        console.error('[contact] email notification failed (message is saved):', mailErr.message);
      }
    }

    return NextResponse.json({ message: 'Thank you! Our team will get back to you within 24 hours.' });
  } catch (error) {
    console.error('[contact] failed:', error);
    return NextResponse.json({ error: 'Could not send your message. Please try again.' }, { status: 500 });
  }
}
