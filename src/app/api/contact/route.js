import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, email, mobile, subject, message } = body;

        // Basic validation
        if (!name || !email || !mobile || !message) {
            return NextResponse.json(
                { error: 'Please fill in all required fields.' },
                { status: 400 }
            );
        }

        // In a real app, you would send an email here using a service like SendGrid, AWS SES, or Nodemailer.
        // Or save to a database table like 'contact_inquiries'.

        // For now, we simulate a successful operation.
        console.log('Contact Form Submission:', { name, email, mobile, subject, message });

        return NextResponse.json({ message: 'Message sent successfully!' });
    } catch (error) {
        console.error('Contact API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
