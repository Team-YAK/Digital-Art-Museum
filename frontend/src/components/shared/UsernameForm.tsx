"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { createUser } from "@/lib/api";

export function UsernameForm() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useUser();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim().toLowerCase();

    if (!trimmed) {
      setError("Please enter a username");
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 20) {
      setError("Username must be 2-20 characters");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      setError("Only lowercase letters, numbers, and underscores");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await createUser(trimmed);
      login(trimmed);
      router.push("/hub");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (msg.includes("already exists")) {
        // Username taken means account exists -- just log in
        login(trimmed);
        router.push("/hub");
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter your username..."
        className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white
                   placeholder-gray-500 focus:outline-none focus:border-purple-500
                   font-mono text-lg"
        maxLength={20}
        autoFocus
        disabled={isSubmitting}
      />
      {error && <p className="text-red-400 text-sm font-mono">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700
                   rounded-lg text-white font-mono text-lg transition-colors"
      >
        {isSubmitting ? "Entering..." : "Enter Museum"}
      </button>
    </form>
  );
}
