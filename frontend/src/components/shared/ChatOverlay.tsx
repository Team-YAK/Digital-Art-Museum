"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { chatWithGuide } from "@/lib/api";
import type { ChatSuggestion } from "@/types/api";

interface Message {
  role: "user" | "guide";
  text: string;
}

interface ChatOverlayProps {
  onClose: () => void;
}

export function ChatOverlay({ onClose }: ChatOverlayProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "guide", text: "Welcome, traveler! I am the museum guide. Ask me about any gallery or artist, and I shall point the way!" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setIsLoading(true);
    setSuggestions([]);

    try {
      const res = await chatWithGuide(text);
      setMessages((prev) => [...prev, { role: "guide", text: res.response }]);
      setSuggestions(res.suggestions);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "guide", text: "My crystal ball is foggy... Try again in a moment!" },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.7)",
          imageRendering: "pixelated",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          margin: "0 16px",
          background: "#1a1208",
          border: "4px solid #d4af37",
          boxShadow: "8px 8px 0px #000, inset 0 0 0 2px #2a1f0a, 0 0 30px rgba(212,175,55,0.15)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          imageRendering: "pixelated",
          fontFamily: "monospace",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            background: "linear-gradient(180deg, #2a1f0a 0%, #1a1208 100%)",
            borderBottom: "3px solid #d4af37",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>🧙</span>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: 14,
                fontWeight: "bold",
                color: "#d4af37",
                textShadow: "1px 1px 0 #000",
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              Museum Guide
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              fontFamily: "monospace",
              fontSize: 14,
              fontWeight: "bold",
              color: "#d4af37",
              background: "#2a1f0a",
              border: "2px solid #d4af37",
              cursor: "pointer",
              padding: "2px 8px",
              textShadow: "1px 1px 0 #000",
            }}
          >
            X
          </button>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 12,
            maxHeight: 300,
            minHeight: 180,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            background: "#0f0c04",
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: "8px 10px",
                  fontFamily: "monospace",
                  fontSize: 13,
                  lineHeight: 1.5,
                  border: msg.role === "user"
                    ? "2px solid #8b6914"
                    : "2px solid #d4af37",
                  background: msg.role === "user"
                    ? "#2a1f0a"
                    : "#1a1510",
                  color: msg.role === "user"
                    ? "#e8d5a3"
                    : "#ffe99a",
                  boxShadow: "3px 3px 0px #000",
                  textShadow: "1px 1px 0 rgba(0,0,0,0.5)",
                }}
              >
                {msg.role === "guide" && (
                  <span style={{ color: "#d4af37", fontWeight: "bold", fontSize: 11, display: "block", marginBottom: 2 }}>
                    GUIDE:
                  </span>
                )}
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div
                style={{
                  padding: "8px 14px",
                  fontFamily: "monospace",
                  fontSize: 14,
                  border: "2px solid #d4af37",
                  background: "#1a1510",
                  color: "#d4af37",
                  boxShadow: "3px 3px 0px #000",
                  animation: "retro-blink 0.6s step-start infinite",
                }}
              >
                ▌
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div
            style={{
              padding: "8px 12px",
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              borderTop: "2px solid #2a1f0a",
              background: "#1a1208",
            }}
          >
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => { onClose(); router.push(`/room/${s.username}`); }}
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  fontWeight: "bold",
                  color: "#1a1208",
                  background: "#d4af37",
                  border: "2px solid #8b6914",
                  cursor: "pointer",
                  padding: "4px 10px",
                  boxShadow: "2px 2px 0px #000",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                → @{s.username}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "10px 12px",
            borderTop: "3px solid #d4af37",
            background: "#1a1208",
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder="> Ask me anything..."
            disabled={isLoading}
            autoFocus
            style={{
              flex: 1,
              fontFamily: "monospace",
              fontSize: 13,
              background: "#0f0c04",
              border: "2px solid #8b6914",
              padding: "8px 10px",
              color: "#ffe99a",
              outline: "none",
              textShadow: "1px 1px 0 rgba(0,0,0,0.5)",
              opacity: isLoading ? 0.5 : 1,
            }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              fontWeight: "bold",
              color: isLoading || !input.trim() ? "#555" : "#1a1208",
              background: isLoading || !input.trim() ? "#2a1f0a" : "#d4af37",
              border: "2px solid #8b6914",
              cursor: isLoading || !input.trim() ? "not-allowed" : "pointer",
              padding: "8px 14px",
              boxShadow: isLoading || !input.trim() ? "none" : "3px 3px 0px #000",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Send
          </button>
        </div>
      </div>

      <style>{`
        @keyframes retro-blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
