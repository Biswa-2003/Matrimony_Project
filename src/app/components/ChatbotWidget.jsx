'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function ChatbotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hi! 👋 I can help you find profiles. Try asking:\n- "Find profiles named Biswajit"\n- "Show profiles starting with P"\n- "How many total profiles?"',
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationHistory, setConversationHistory] = useState([]);
    const [showGreeting, setShowGreeting] = useState(true);
    const [greetingDismissed, setGreetingDismissed] = useState(false);
    const messagesEndRef = useRef(null);

    // Show greeting after a delay when component mounts
    useEffect(() => {
        const greetingTimer = setTimeout(() => {
            if (!isOpen && !greetingDismissed) {
                setShowGreeting(true);
            }
        }, 2000); // Show greeting after 2 seconds

        return () => clearTimeout(greetingTimer);
    }, [isOpen, greetingDismissed]);

    // Auto-hide greeting after some time
    useEffect(() => {
        if (showGreeting && !isOpen) {
            const hideTimer = setTimeout(() => {
                setShowGreeting(false);
            }, 10000); // Hide after 10 seconds if not interacted

            return () => clearTimeout(hideTimer);
        }
    }, [showGreeting, isOpen]);

    const handleOpenChat = () => {
        setIsOpen(true);
        setShowGreeting(false);
        setGreetingDismissed(true);
    };

    const dismissGreeting = () => {
        setShowGreeting(false);
        setGreetingDismissed(true);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');

        // Add user message
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    conversationHistory,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to get response');
            }

            // Add assistant message
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.reply,
                cards: data.cards, // Profile cards if any
            }]);

            // Update conversation history
            setConversationHistory(data.conversationHistory || []);

        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Sorry, I encountered an error: ${error.message}`,
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Proactive Greeting Bubble */}
            {!isOpen && showGreeting && (
                <div
                    className="position-fixed shadow-lg bg-white rounded-4 p-3 animate-greeting"
                    style={{
                        bottom: 90,
                        right: 20,
                        width: 280,
                        zIndex: 1000,
                        animation: 'slideUp 0.5s ease-out',
                    }}
                >
                    <div className="d-flex align-items-start gap-2">
                        <div className="flex-grow-1">
                            <div className="fw-bold text-maroon mb-1">
                                👋 Hi there!
                            </div>
                            <div className="small text-muted">
                                How can I help you today? Feel free to ask me anything!
                            </div>
                        </div>
                        <button
                            onClick={dismissGreeting}
                            className="btn btn-link p-0 text-muted"
                            style={{ fontSize: '1.2rem', lineHeight: 1 }}
                        >
                            ×
                        </button>
                    </div>
                    {/* Pointer arrow */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: -8,
                            right: 25,
                            width: 0,
                            height: 0,
                            borderLeft: '8px solid transparent',
                            borderRight: '8px solid transparent',
                            borderTop: '8px solid white',
                        }}
                    />
                </div>
            )}

            {/* Chat Button */}
            {!isOpen && (
                <button
                    onClick={handleOpenChat}
                    className="position-fixed shadow-lg rounded-circle d-flex align-items-center justify-content-center chatbot-pulse"
                    style={{
                        bottom: 20,
                        right: 20,
                        width: 60,
                        height: 60,
                        background: 'linear-gradient(135deg, #E33183, #800020)',
                        border: 'none',
                        zIndex: 1000,
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <i className="bi bi-chat-dots-fill text-white" style={{ fontSize: '1.5rem' }}></i>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div
                    className="position-fixed shadow-lg bg-white rounded-4 d-flex flex-column"
                    style={{
                        bottom: 20,
                        right: 20,
                        width: 380,
                        height: 600,
                        zIndex: 1001,
                        overflow: 'hidden',
                    }}
                >
                    {/* Header */}
                    <div className="p-3 text-white d-flex justify-content-between align-items-center" style={{ background: 'linear-gradient(135deg, #E33183, #800020)' }}>
                        <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-robot" style={{ fontSize: '1.5rem' }}></i>
                            <div>
                                <div className="fw-bold">MatriMoney AI</div>
                                <small style={{ fontSize: '0.75rem', opacity: 0.9 }}>Ask me anything!</small>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="btn btn-link text-white p-0"
                            style={{ fontSize: '1.5rem' }}
                        >
                            <i className="bi bi-x"></i>
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-grow-1 p-3 overflow-auto" style={{ maxHeight: '100%' }}>
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`mb-3 ${msg.role === 'user' ? 'text-end' : ''}`}>
                                <div
                                    className={`d-inline-block p-3 rounded-3 ${msg.role === 'user'
                                        ? 'bg-primary text-white'
                                        : 'bg-light text-dark'
                                        }`}
                                    style={{
                                        maxWidth: '85%',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    {msg.content}
                                </div>

                                {/* Profile Cards */}
                                {msg.cards && msg.cards.length > 0 && (
                                    <div className="mt-3">
                                        {msg.cards.map((card, cidx) => (
                                            <div key={cidx} className="card mb-2 shadow-sm hover-lift" style={{ borderRadius: 12 }}>
                                                <div className="card-body p-3">
                                                    <div className="d-flex align-items-center gap-3">
                                                        <Image
                                                            src={card.photo_url || '/uploads/default.jpg'}
                                                            alt={card.first_name}
                                                            width={50}
                                                            height={50}
                                                            className="rounded-circle"
                                                            style={{ objectFit: 'cover' }}
                                                            onError={(e) => e.target.src = '/uploads/default.jpg'}
                                                        />
                                                        <div className="flex-grow-1">
                                                            <div className="fw-bold text-maroon">
                                                                {card.first_name} {card.last_name}
                                                            </div>
                                                            <small className="text-muted">
                                                                {card.age} yrs • {card.gender}
                                                            </small>
                                                            {card.city_name && (
                                                                <div className="small text-muted">
                                                                    <i className="bi bi-geo-alt me-1"></i>
                                                                    {card.city_name}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Link
                                                        href={`/matrimoney/profile-details/${card.matri_id}`}
                                                        className="btn btn-sm btn-primary w-100 mt-2 rounded-pill"
                                                    >
                                                        View Profile <i className="bi bi-arrow-right ms-1"></i>
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="text-start mb-3">
                                <div className="d-inline-block p-3 bg-light rounded-3">
                                    <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                                    Thinking...
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={sendMessage} className="p-3 border-top bg-light">
                        <div className="input-group">
                            <input
                                type="text"
                                className="form-control border-0 shadow-sm"
                                placeholder="Ask me anything..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={isLoading}
                                style={{ borderRadius: '20px 0 0 20px' }}
                            />
                            <button
                                type="submit"
                                className="btn btn-primary shadow-sm"
                                disabled={isLoading || !input.trim()}
                                style={{ borderRadius: '0 20px 20px 0' }}
                            >
                                <i className="bi bi-send-fill"></i>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <style jsx global>{`
        .hover-lift {
          transition: transform 0.2s ease;
        }
        .hover-lift:hover {
          transform: translateY(-2px);
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(227, 49, 131, 0.7);
          }
          70% {
            box-shadow: 0 0 0 15px rgba(227, 49, 131, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(227, 49, 131, 0);
          }
        }
        
        .chatbot-pulse {
          animation: pulse 2s infinite;
        }
      `}</style>
        </>
    );
}
