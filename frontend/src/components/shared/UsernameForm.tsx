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
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%", maxWidth: 360, margin: "0 auto", fontFamily: "monospace" }}>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        style={{
          padding: "16px 20px",
          background: "#0f0c04",
          border: "2px solid #8b6914",
          color: "#ffe99a",
          outline: "none",
          fontSize: 16,
          boxShadow: "inset 2px 2px 0 #000"
        }}
        maxLength={20}
        autoFocus
        disabled={isSubmitting}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        style={{
          padding: "16px 20px",
          background: "#0f0c04",
          border: "2px solid #8b6914",
          color: "#ffe99a",
          outline: "none",
          fontSize: 16,
          boxShadow: "inset 2px 2px 0 #000"
        }}
        disabled={isSubmitting}
      />
      {error && (
        <div style={{ padding: "10px 14px", background: "#3a0000", border: "2px solid #ff4444", color: "#ff8888", fontSize: 13, textTransform: "uppercase" }}>
          {error}
        </div>
      )}
      
      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          marginTop: 8,
          padding: "16px",
          background: isSubmitting ? "#8b6914" : "#d4af37",
          border: "2px solid #8b6914",
          color: "#1a1208",
          fontSize: 16,
          fontWeight: "bold",
          textTransform: "uppercase",
          letterSpacing: 2,
          cursor: isSubmitting ? "not-allowed" : "pointer",
          boxShadow: "3px 3px 0 #000",
          transition: "transform 0.1s"
        }}
      >
        {isSubmitting
          ? "Entering..."
          : mode === "login"
          ? "Enter Museum"
          : "Create Account"}
      </button>

      <div style={{ display: "flex", alignItems: "center", margin: "16px 0" }}>
        <div style={{ flex: 1, borderTop: "2px solid #8b6914" }}></div>
        <span style={{ padding: "0 16px", color: "#8b6914", fontSize: 12, textTransform: "uppercase", fontWeight: "bold" }}>or</span>
        <div style={{ flex: 1, borderTop: "2px solid #8b6914" }}></div>
      </div>

      <button
        type="button"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
        style={{
          background: "none",
          border: "none",
          color: "#d4af37",
          fontSize: 14,
          cursor: "pointer",
          textDecoration: "underline",
          textUnderlineOffset: 4,
          fontFamily: "monospace"
        }}
      >
        {mode === "login"
          ? "New here? Create an account"
          : "Already have an account? Log in"}
      </button>
    </form>
  );
}
