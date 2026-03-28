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
    { role: "guide", text: "Welcome! I'm the museum guide. Ask me about any room or artist, or I can take you somewhere interesting!" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close on ESC
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
        { role: "guide", text: "I seem to be having trouble right now. Try again in a moment!" },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md mx-4 bg-gray-900 border border-purple-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="font-mono text-white font-bold">Guide NPC</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-mono text-lg">✕</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80 min-h-48">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xs px-3 py-2 rounded-lg font-mono text-sm ${
                  msg.role === "user"
                    ? "bg-purple-700 text-white"
                    : "bg-gray-700 text-gray-100"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-700 text-gray-400 px-3 py-2 rounded-lg font-mono text-sm animate-pulse">
                ...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => { onClose(); router.push(`/room/${s.username}`); }}
                className="px-3 py-1 bg-purple-900 hover:bg-purple-700 border border-purple-600
                           rounded-full font-mono text-xs text-white transition-colors"
              >
                Visit {s.username}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2 p-3 border-t border-gray-700">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            placeholder="Ask me anything..."
            disabled={isLoading}
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2
                       font-mono text-sm text-white placeholder-gray-500
                       focus:outline-none focus:border-purple-500 disabled:opacity-50"
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40
                       rounded-lg font-mono text-sm text-white transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
