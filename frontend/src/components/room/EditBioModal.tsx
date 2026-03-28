"use client";

import React, { useState } from "react";
import { updateRoomDescription } from "@/lib/api";
import { EventBus } from "@/game/EventBus";

interface EditBioModalProps {
  username: string;
  currentBio: string;
  onClose: () => void;
  onSaved: (newBio: string) => void;
}

export default function EditBioModal({ username, currentBio, onClose, onSaved }: EditBioModalProps) {
  const [bio, setBio] = useState(currentBio || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await updateRoomDescription(username, bio.trim());
      EventBus.emit("bio-updated", { bio: bio.trim() });
      onSaved(bio.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save bio");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(145deg, #1a1a2e, #16213e)",
          border: "1px solid #d4af3744",
          borderRadius: "16px",
          padding: "28px",
          maxWidth: "480px",
          width: "90%",
          boxShadow: "0 24px 80px rgba(212, 175, 55, 0.15)",
          animation: "slideUp 0.3s ease-out",
        }}
      >
        <h2
          style={{
            fontFamily: "monospace",
            fontSize: "20px",
            color: "#d4af37",
            margin: "0 0 16px 0",
          }}
        >
          ✏️ Edit Artist Bio
        </h2>

        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell visitors about yourself and your art..."
          rows={5}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: "8px",
            border: "1px solid #333",
            background: "#0d0d1a",
            color: "#e0e0e0",
            fontFamily: "monospace",
            fontSize: "14px",
            marginBottom: "16px",
            outline: "none",
            resize: "vertical",
            lineHeight: "1.5",
            boxSizing: "border-box",
          }}
        />

        {error && (
          <p
            style={{
              color: "#ff4444",
              fontFamily: "monospace",
              fontSize: "12px",
              marginBottom: "12px",
            }}
          >
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{
              fontFamily: "monospace",
              fontSize: "13px",
              color: "#aaa",
              background: "transparent",
              border: "1px solid #444",
              borderRadius: "8px",
              padding: "8px 20px",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              fontFamily: "monospace",
              fontSize: "13px",
              color: "#1a1a2e",
              background: isSaving ? "#888" : "linear-gradient(135deg, #d4af37, #f5d061)",
              border: "none",
              borderRadius: "8px",
              padding: "8px 24px",
              cursor: isSaving ? "not-allowed" : "pointer",
              fontWeight: "bold",
              transition: "all 0.2s",
            }}
          >
            {isSaving ? "Saving…" : "Save Bio"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
