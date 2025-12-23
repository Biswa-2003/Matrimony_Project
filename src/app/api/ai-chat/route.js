import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const { message, history } = await req.json();

        // Here you can integrate with Google Gemini API or any other AI service
        // For now, providing helpful matrimony-related responses

        const replies = getMatrimonyReply(message.toLowerCase());

        return NextResponse.json({
            reply: replies || "I'm here to help with your matrimony questions. Could you please elaborate on what you'd like to know?"
        });

    } catch (error) {
        console.error('AI Chat Error:', error);
        return NextResponse.json(
            { error: 'Failed to process your request' },
            { status: 500 }
        );
    }
}

function getMatrimonyReply(message) {
    // Search functionality
    if (message.includes('search') || message.includes('find')) {
        return "To search for matches, go to the **Search** page from the top menu. You can filter by age, height, religion, location, and more! 🔍";
    }

    // Profile-related
    if (message.includes('profile') || message.includes('edit')) {
        return "You can edit your profile by clicking on your name in the top right corner and selecting **Profile Settings**. Make sure to complete all sections for better matches! ✨";
    }

    // Matches
    if (message.includes('match') || message.includes('recommendation')) {
        return "Check out your personalized matches on the **My Home** page! We show:\n• New Matches\n• Premium Matches\n• Mutual Matches\n• Who viewed your profile\n\nVisit regularly for fresh recommendations! 💝";
    }

    // Interest/Contact
    if (message.includes('interest') || message.includes('contact')) {
        return "To express interest:\n1. Visit a profile you like\n2. Click **Send Interest**\n3. Wait for them to accept\n4. Once accepted, you can view contact details! 📞";
    }

    // Package/Subscription
    if (message.includes('package') || message.includes('plan') || message.includes('subscription')) {
        return "We offer different membership plans:\n• **Free**: Basic search & 3 interests/month\n• **Silver**: 50 interests + premium support\n• **Gold**: Unlimited interests + priority listing\n• **Platinum**: All features + dedicated relationship manager\n\nUpgrade from the **Plans** page! 💎";
    }

    // Privacy
    if (message.includes('privacy') || message.includes('hide') || message.includes('visible')) {
        return "Control your privacy in **Profile Settings**:\n• Hide your profile from search\n• Control who can view your photos\n• Manage contact visibility\n• Set call preferences\n\nYour privacy matters to us! 🔒";
    }

    // Success stories
    if (message.includes('success') || message.includes('story') || message.includes('wedding')) {
        return "We love hearing success stories! 💕\n\nIf you found your match through MatriMoney:\n1. Go to **Success Stories** page\n2. Share your beautiful journey\n3. Upload wedding photos\n4. Inspire others!\n\nCongratulations in advance! 🎉";
    }

    // Help/Navigation
    if (message.includes('help') || message.includes('how') || message.includes('navigate')) {
        return "I can help you with:\n✨ Searching for matches\n✨ Editing your profile\n✨ Managing interests & contacts\n✨ Understanding membership plans\n✨ Privacy settings\n✨ Photo uploads\n✨ Success stories\n\nWhat would you like to know more about?";
    }

    // Greeting
    if (message.includes('hi') || message.includes('hello') || message.includes('hey')) {
        return "Hello! 👋 Welcome to MatriMoney! I'm here to help you find your perfect match. What can I assist you with today?";
    }

    // Thank you
    if (message.includes('thank') || message.includes('thanks')) {
        return "You're welcome! 😊 Feel free to ask me anything anytime. Happy matchmaking! 💕";
    }

    // Default helpful response
    return "I'm your MatriMoney assistant! I can help you with:\n\n🔍 **Searching** for matches\n👤 **Profile** editing & settings\n💝 **Managing** interests & contacts\n💎 **Membership** plans & upgrades\n🔒 **Privacy** controls\n\nWhat would you like to know?";
}
