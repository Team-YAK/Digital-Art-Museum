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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full max-w-sm mx-auto">
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        className="px-5 py-4 bg-black/30 border border-white/10 rounded-xl text-white
                   placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50
                   font-sans text-lg backdrop-blur-md transition-all shadow-inner"
        maxLength={20}
        autoFocus
        disabled={isSubmitting}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="px-5 py-4 bg-black/30 border border-white/10 rounded-xl text-white
                   placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50
                   font-sans text-lg backdrop-blur-md transition-all shadow-inner"
        disabled={isSubmitting}
      />
      {error && <p className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-500/20">{error}</p>}
      
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500
                   disabled:from-gray-700 disabled:to-gray-800 rounded-xl text-white font-bold text-lg 
                   transition-all transform hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(6,182,212,0.3)]
                   active:scale-95 shadow-lg border border-white/10"
      >
        {isSubmitting
          ? "Entering..."
          : mode === "login"
          ? "Enter Museum"
          : "Create Account"}
      </button>

      <div className="relative flex items-center py-4">
        <div className="flex-grow border-t border-white/10"></div>
        <span className="flex-shrink-0 mx-4 text-gray-500 text-xs uppercase tracking-widest">or</span>
        <div className="flex-grow border-t border-white/10"></div>
      </div>

      <button
        type="button"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        className="text-gray-400 hover:text-white text-sm transition-colors py-2 rounded-lg hover:bg-white/5"
      >
        {mode === "login"
          ? "New here? Create an account"
          : "Already have an account? Log in"}
      </button>
    </form>
  );
}
