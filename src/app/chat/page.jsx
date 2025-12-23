"use client";

import { useEffect, useRef, useState } from "react";

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I’m your matrimony assistant. How can I help?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  const listRef = useRef(null);

  // Auto scroll to bottom on new messages / loading change
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setErrorText("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Request failed");
      }

      setMessages((m) => [
        ...m,
        { role: "assistant", content: data?.reply || "No reply received." },
      ]);
    } catch (e) {
      setErrorText(e?.message || "Something went wrong");
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Sorry, I couldn’t respond right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    setErrorText("");
    setInput("");
    setMessages([
      {
        role: "assistant",
        content: "Chat cleared ✅ How can I help now?",
      },
    ]);
  };

  const canSend = input.trim().length > 0 && !loading;

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "20px auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Matrimony AI Chat</h2>
          <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
            Enter to send • Shift+Enter for new line
          </div>
        </div>

        <button
          onClick={clearChat}
          type="button"
          style={{
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#fff",
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          Clear chat
        </button>
      </div>

      {/* Chat box */}
      <div
        ref={listRef}
        style={{
          border: "1px solid #e5e5e5",
          borderRadius: 14,
          padding: 12,
          height: 520,
          overflowY: "auto",
          background: "#fff",
          boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
        }}
      >
        {messages.map((m, idx) => {
          const isUser = m.role === "user";
          return (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  maxWidth: "78%",
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid #eee",
                  background: isUser ? "#eef4ff" : "#f7f7f7",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.4,
                }}
              >
                {m.content}
              </div>
            </div>
          );
        })}

        {/* Typing bubble */}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid #eee",
                background: "#f7f7f7",
                fontSize: 14,
                color: "#666",
              }}
            >
              Assistant is typing…
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {errorText ? (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 12,
            background: "#fff2f2",
            border: "1px solid #ffd6d6",
            color: "#b00020",
            fontSize: 14,
          }}
        >
          {errorText}
        </div>
      ) : null}

      {/* Input */}
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your message…"
          rows={2}
          style={{
            flex: 1,
            borderRadius: 14,
            border: "1px solid #ddd",
            padding: 12,
            outline: "none",
            resize: "none",
            boxShadow: "0 1px 10px rgba(0,0,0,0.04)",
          }}
        />

        <button
          onClick={send}
          disabled={!canSend}
          type="button"
          style={{
            minWidth: 110,
            borderRadius: 14,
            border: "1px solid #ddd",
            padding: "10px 14px",
            cursor: canSend ? "pointer" : "not-allowed",
            background: canSend ? "#111" : "#eee",
            color: canSend ? "#fff" : "#888",
            boxShadow: canSend ? "0 1px 10px rgba(0,0,0,0.08)" : "none",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
