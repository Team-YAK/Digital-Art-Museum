"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { register, login as apiLogin } from "@/lib/api";

export function UsernameForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const { login } = useUser();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim().toLowerCase();

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
    if (!password || password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res =
        mode === "register"
          ? await register(trimmed, password)
          : await apiLogin(trimmed, password);
      login(res.username, res.access_token);
      router.push("/hub");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (msg.includes("already exists")) {
        setError("Username taken. Try logging in instead.");
      } else if (msg.includes("Invalid username or password")) {
        setError("Invalid username or password");
      } else if (msg.includes("no password set")) {
        setError("Account has no password. Please register again.");
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
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white
                   placeholder-gray-500 focus:outline-none focus:border-yellow-600
                   font-mono text-lg"
        maxLength={20}
        autoFocus
        disabled={isSubmitting}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white
                   placeholder-gray-500 focus:outline-none focus:border-yellow-600
                   font-mono text-lg"
        disabled={isSubmitting}
      />
      {error && <p className="text-red-400 text-sm font-mono">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="px-6 py-3 bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-700
                   rounded-lg text-white font-mono text-lg transition-colors"
      >
        {isSubmitting
          ? "Entering..."
          : mode === "login"
          ? "Enter Museum"
          : "Create Account"}
      </button>
      <button
        type="button"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        className="text-gray-400 hover:text-yellow-500 text-sm font-mono transition-colors"
      >
        {mode === "login"
          ? "New here? Create an account"
          : "Already have an account? Log in"}
      </button>
    </form>
  );
}
