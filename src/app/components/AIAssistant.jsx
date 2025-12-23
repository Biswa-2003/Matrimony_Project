'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import './AIAssistant.css';

export default function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hi! I'm your matrimony assistant. Try asking:\n• 'Find profiles named Biswajit'\n• 'Show profiles starting with P'\n• 'How many total profiles?'"
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationHistory, setConversationHistory] = useState([]);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');

        // Add user message
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    conversationHistory
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data && data.reply) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.reply,
                    cards: data.cards // ✅ Profile cards from AI search
                }]);

                // Update conversation history
                if (data.conversationHistory) {
                    setConversationHistory(data.conversationHistory);
                }
            } else {
                console.error('Invalid response:', data);
                throw new Error('No reply in response');
            }
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm having trouble connecting right now. Please try again in a moment! 🙏"
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const clearChat = () => {
        setMessages([{
            role: 'assistant',
            content: "Hi! I'm your matrimony assistant. How can I help you today? 😊"
        }]);
        setConversationHistory([]);
    };

    return (
        <>
            {/* Floating Button */}
            <button
                className="ai-assistant-toggle"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle AI Assistant"
            >
                {isOpen ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l5.71-.97C9 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" fill="currentColor" />
                        <circle cx="8" cy="12" r="1.5" fill="white" />
                        <circle cx="12" cy="12" r="1.5" fill="white" />
                        <circle cx="16" cy="12" r="1.5" fill="white" />
                    </svg>
                )}
                {!isOpen && <span className="ai-assistant-badge">AI</span>}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="ai-assistant-window">
                    {/* Header */}
                    <div className="ai-assistant-header">
                        <div className="ai-assistant-header-content">
                            <div className="ai-assistant-avatar">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" fill="currentColor" />
                                </svg>
                            </div>
                            <div>
                                <h3>MatriMoney Assistant</h3>
                                <p>Powered by AI</p>
                            </div>
                        </div>
                        <button onClick={clearChat} className="ai-clear-btn" title="Clear chat">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="ai-assistant-messages">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`ai-message ai-message-${msg.role}`}>
                                <div className="ai-message-content">
                                    {msg.content}
                                </div>

                                {/* ✅ Profile Cards - HORIZONTAL SINGLE LINE */}
                                {msg.cards && msg.cards.length > 0 && (
                                    <div className="ai-profile-cards mt-2">
                                        {msg.cards.map((card, cidx) => (
                                            <div key={cidx} className="ai-profile-card mb-2">
                                                <div className="d-flex align-items-center gap-2 p-2">
                                                    <Image
                                                        src={card.photo_url || '/uploads/default.jpg'}
                                                        alt={card.first_name}
                                                        width={38}
                                                        height={38}
                                                        className="rounded-circle flex-shrink-0"
                                                        style={{ objectFit: 'cover' }}
                                                        onError={(e) => e.target.src = '/uploads/default.jpg'}
                                                    />
                                                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                                        <div className="fw-bold text-truncate" style={{ fontSize: '12px', color: '#E33183' }}>
                                                            {card.first_name} {card.last_name}
                                                        </div>
                                                        <div className="text-muted text-truncate" style={{ fontSize: '10px' }}>
                                                            {card.age}y • {card.gender.charAt(0)} • {card.city_name || 'N/A'}
                                                        </div>
                                                    </div>
                                                    <Link
                                                        href={`/matrimoney/profile-details/${card.matri_id}`}
                                                        className="btn btn-sm btn-primary flex-shrink-0"
                                                        style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '12px', whiteSpace: 'nowrap' }}
                                                    >
                                                        View →
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="ai-message ai-message-assistant">
                                <div className="ai-message-content ai-typing">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="ai-assistant-input">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask me: Find profiles named..."
                            rows="1"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="ai-send-btn"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
