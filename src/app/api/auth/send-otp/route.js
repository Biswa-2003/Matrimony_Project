
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Simple in-memory store for OTPs (For production, use Redis or DB)
// Map<email, { otp, expires }>
export const otpStore = new Map();

export async function POST(req) {
    try {
        // 🛡️ Rate Limiting
        const ip = req.headers.get("x-forwarded-for") || "unknown";
        if (!rateLimit(ip, 3, 60 * 60 * 1000)) { // 3 OTP requests per hour (prevent spam)
            return NextResponse.json({ error: "Too many OTP requests. Please wait." }, { status: 429 });
        }

        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // Generate 6 digit OTP
        const otp = crypto.randomInt(100000, 1000000).toString();

        // Store in memory (expires in 10 mins)
        otpStore.set(email, {
            otp,
            expires: Date.now() + 10 * 60 * 1000
        });

        console.log(`[OTP DEBUG] OTP for ${email} is: ${otp}`);

        // Attempt to send email if credentials exist
        // Otherwise just success (development mode relies on console log)
        try {
            if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
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
                   <h1 style="color: #E33183; letter-spacing: 5px;">${otp}</h1>
                   <p>This code expires in 10 minutes.</p>
                 </div>`
                });
            }
        } catch (emailError) {
            console.error("Failed to send email:", emailError);
            // Continue, as we might be in dev mode without email setup
        }

        return NextResponse.json({
            message: "OTP sent successfully",
            dev_otp: process.env.NODE_ENV === 'development' ? otp : undefined
        });

    } catch (error) {
        console.error("OTP Error:", error);
        return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
    }
}
