
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

// Simple in-memory store for OTPs (For production, use Redis or DB)
// Map<email, { otp, expires }>
export const otpStore = new Map();

export async function POST(req) {
    try {
        // 🛡️ Rate Limiting
        const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
        if (!rateLimit(`otp-ip:${ip}`, 6, 60 * 60 * 1000)) { // 6 OTP requests per hour per IP
            return NextResponse.json({ error: "Too many OTP requests. Please try again later." }, { status: 429 });
        }

        const { email: rawEmail, phone: rawPhone } = await req.json().catch(() => ({}));
        const phone = String(rawPhone || "").replace(/[^\d+]/g, "").slice(0, 15) || null;
        const email = String(rawEmail || "").trim().toLowerCase();

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
        }
        // don't let anyone flood one inbox: 3 codes per address per 10 minutes
        if (!rateLimit(`otp-email:${email}`, 3, 10 * 60 * 1000)) {
            return NextResponse.json({ error: "We've already sent a few codes to this email. Please wait 10 minutes." }, { status: 429 });
        }

        // Generate 6 digit OTP
        const otp = crypto.randomInt(100000, 1000000).toString();

        const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
        otpStore.set(email, { otp, expires });

        // Persist so /api/register can verify it from any server instance (serverless-safe).
        // Delivery status is filled in below so admins can help people whose email never arrives.
        const persist = (delivery) => query(
            `INSERT INTO otp_verification (email, phone, otp, otp_expiry, created_at, delivery, issued_by)
             VALUES ($1, $2, $3, $4, NOW(), $5, NULL)
             ON CONFLICT (email) DO UPDATE SET otp = EXCLUDED.otp, otp_expiry = EXCLUDED.otp_expiry,
               phone = COALESCE(EXCLUDED.phone, otp_verification.phone), created_at = NOW(),
               delivery = EXCLUDED.delivery, issued_by = NULL`,
            [email, phone, otp, new Date(expires), delivery]
        ).catch((dbErr) => console.error("Failed to persist OTP:", dbErr.message));
        try { await ensureSchema(); } catch { /* table exists in older DBs */ }
        await persist("pending");

        if (process.env.NODE_ENV === "development") {
            console.log(`[OTP DEBUG] OTP for ${email} is: ${otp}`);
        }

        // Attempt to send the email. Reserved test domains (.invalid, example.com…) are never mailed.
        let delivery = "not_configured";
        const reserved = /@([a-z0-9-]+\.)*(invalid|test|example|localhost)$/i.test(email) || /@example\.(com|net|org)$/i.test(email);
        try {
            if (reserved) {
                delivery = "undeliverable";
            } else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                const transporter = nodemailer.createTransport({
                    service: 'gmail', // or configured host
                    port: 465,
                    secure: true,
                    requireTLS: true,
                    secured: true,
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS,
                    },
                });

                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: 'Your MatriMoney OTP Code',
                    text: `Your verification code is: ${otp}`,
                    html: `<div style="font-family: sans-serif; padding: 20px;">
                   <h2>MatriMoney Verification</h2>
                   <p>Your OTP code is:</p>
                   <h1 style="color: #a3123a; letter-spacing: 5px;">${otp}</h1>
                   <p>This code expires in 10 minutes.</p>
                 </div>`
                });
                delivery = "sent";
            }
        } catch (emailError) {
            console.error("Failed to send OTP email:", emailError.message);
            delivery = "failed";
        }
        await persist(delivery);

        const delivered = delivery === "sent";
        return NextResponse.json({
            message: delivered ? "OTP sent successfully" : "We couldn't email the code to this address.",
            delivered,
            help: delivered ? undefined : "Please contact MatriMoney support with this email address — our team can verify you and give you the code.",
            dev_otp: process.env.NODE_ENV === 'development' ? otp : undefined
        });

    } catch (error) {
        console.error("OTP Error:", error);
        return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
    }
}
